import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Download, FolderOpen, FolderSync, RefreshCw, RotateCcw, Upload } from "lucide-react";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { resolvePublicAssetUrl } from "@/lib/assets";
import { getBaseName } from "@/lib/utils";
import { getNodeByPath } from "@/lib/filesystem";
import { attachV86Volume } from "@/lib/master-volume";
import {
  V86_BIOS_PATH,
  V86_VGA_BIOS_PATH,
  V86_WASM_PATH,
  loadV86Runtime,
  resolveVirtualX86Drive,
  sharedFileName,
  sourceToArrayBuffer,
} from "@/lib/v86";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";
import type { V86 as V86Instance } from "v86";

const EMULATOR_MEMORY_SIZE = 128 * 1024 * 1024;
const EMULATOR_VGA_MEMORY_SIZE = 8 * 1024 * 1024;
const SHARED_FILE_LIMIT_BYTES = 64 * 1024 * 1024;
const MAX_SCREEN_SCALE = 2;
const SHELL_POLL_MS = 300;
const SHELL_QUIET_POLLS = 4;
const RESTART_SETTLE_MS = 2500;

/**
 * The bundled Linux starts a shell on the screen and one on the serial port, and its
 * /etc/profile mounts /mnt in both. Whichever comes second prints a mount error even
 * though /mnt is fine, and the profile sits compressed inside the kernel image. So once
 * the screen settles, the unseen serial shell quietens the kernel's console messages,
 * wipes the screen and puts the prompt back.
 */
const QUIET_KERNEL = "dmesg -n 1\n";
const CLEAR_BOOT_NOISE = "dmesg -n 1; printf '\\033c\\nShared folder: /mnt\\n\\n~%% ' > /dev/tty0\n";

let biosBufferPromise: Promise<{ bios: ArrayBuffer; vgaBios: ArrayBuffer }> | null = null;

function loadBiosBuffers() {
  if (!biosBufferPromise) {
    biosBufferPromise = Promise.all([
      sourceToArrayBuffer(V86_BIOS_PATH),
      sourceToArrayBuffer(V86_VGA_BIOS_PATH),
    ]).then(([bios, vgaBios]) => ({ bios, vgaBios }));
  }

  return biosBufferPromise;
}

/** What boots when no disk image was opened: a small Linux that ships with the site. */
const BUNDLED_LINUX: VirtualFile = {
  kind: "file",
  path: "/linux.iso",
  name: "Linux",
  extension: "iso",
  mimeType: "application/x-iso9660-image",
  source: resolvePublicAssetUrl("assets/v86/linux.iso"),
  size: 7_731_200,
  readonly: true,
  createdAt: 0,
  updatedAt: 0,
} as VirtualFile;

function isDiskImage(node?: VirtualFile | null) {
  return Boolean(node && ["img", "iso"].includes(node.extension.toLowerCase()) && node.source);
}

export function VirtualX86App({ window: appWindow }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const emulatorRef = useRef<V86Instance | null>(null);
  const shellTimer = useRef<number | undefined>(undefined);
  const [status, setStatus] = useState("Waiting for a disk image");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [sharedOpen, setSharedOpen] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<string[]>([]);

  const diskFile = useMemo(() => {
    const filePath = appWindow.payload?.filePath;
    if (!filePath) return BUNDLED_LINUX;
    const node = getNodeByPath(nodes, filePath);
    return node && node.kind === "file" ? node : null;
  }, [appWindow.payload?.filePath, nodes]);
  const hasDiskImage = isDiskImage(diskFile);

  // v86 listens on the whole page, so the guest only gets keys while its window is in front.
  const focused = appWindow.focused;
  useEffect(() => {
    emulatorRef.current?.keyboard_set_enabled(focused);
    emulatorRef.current?.mouse_set_enabled?.(focused);
  }, [focused, status]);

  const clearBootNoise = (emulator: V86Instance) => {
    let last = "";
    let quiet = 0;
    const finish = (command: string) => {
      globalThis.clearInterval(shellTimer.current);
      emulator.remove_listener("keyboard-code", typed);
      emulator.serial0_send(command);
    };
    // Someone already typing matters more than a tidy screen, so their first key leaves it as it is.
    const typed = () => finish(QUIET_KERNEL);
    emulator.add_listener("keyboard-code", typed);
    globalThis.clearInterval(shellTimer.current);
    shellTimer.current = window.setInterval(() => {
      const text = screenRef.current?.textContent ?? "";
      quiet = text === last ? quiet + 1 : 0;
      last = text;
      if (quiet >= SHELL_QUIET_POLLS && text.includes("~%")) finish(CLEAR_BOOT_NOISE);
    }, SHELL_POLL_MS);
  };

  const restart = () => {
    const emulator = emulatorRef.current;
    if (!emulator) return;
    globalThis.clearInterval(shellTimer.current);
    emulator.restart();
    // The last boot's prompt stays on screen until the BIOS clears it.
    if (diskFile === BUNDLED_LINUX) shellTimer.current = window.setTimeout(() => clearBootNoise(emulator), RESTART_SETTLE_MS);
  };

  // The guest picks its own resolution, so the screen is scaled to the window and not the other way round.
  useEffect(() => {
    const stage = stageRef.current;
    const screen = screenRef.current;
    if (!stage || !screen) return undefined;

    const fit = () => {
      if (!screen.offsetWidth || !screen.offsetHeight) return;
      const scale = Math.min(stage.clientWidth / screen.offsetWidth, stage.clientHeight / screen.offsetHeight, MAX_SCREEN_SCALE);
      screen.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    observer.observe(screen);
    return () => observer.disconnect();
  }, [hasDiskImage]);

  useEffect(() => {
    const container = screenRef.current;

    if (!container) {
      return;
    }

    container.replaceChildren();
    setErrorMessage(null);
    setRunning(false);
    setSharedFiles([]);

    if (!hasDiskImage || !diskFile?.source) {
      setStatus("Open a .img or .iso from Explorer to boot it.");
      return;
    }

    const diskSource = diskFile.source;
    let cancelled = false;
    let detachVolume: (() => void) | undefined;
    setStatus("Loading the emulator");

    void (async () => {
      try {
        const [{ V86 }, { bios, vgaBios }, diskBuffer] = await Promise.all([
          loadV86Runtime(),
          loadBiosBuffers(),
          sourceToArrayBuffer(diskSource),
        ]);

        if (cancelled || !screenRef.current) {
          return;
        }

        const drive = resolveVirtualX86Drive(diskFile);
        const emulator = new V86({
          autostart: false,
          wasm_path: V86_WASM_PATH,
          memory_size: EMULATOR_MEMORY_SIZE,
          vga_memory_size: EMULATOR_VGA_MEMORY_SIZE,
          screen_container: screenRef.current,
          bios: { buffer: bios },
          vga_bios: { buffer: vgaBios },
          // The guest finds this as the 9p device "host9p" and the bundled Linux mounts it at /mnt.
          filesystem: {},
          [drive]: {
            buffer: diskBuffer,
            size: diskFile.size ?? diskBuffer.byteLength,
          },
        });

        emulatorRef.current = emulator;
        // The guest's sound goes through the master volume from Quick Settings.
        detachVolume = attachV86Volume(emulator);

        emulator.add_listener("emulator-ready", () => {
          void (async () => {
            try {
              setStatus("Booting");
              if (cancelled) {
                return;
              }

              await emulator.run();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "The imported disk image could not be booted.";
              setErrorMessage(message);
              setStatus("Boot failed");
            }
          })();
        });

        emulator.add_listener("emulator-started", () => {
          setStatus("Running");
          setRunning(true);
          if (diskFile === BUNDLED_LINUX) clearBootNoise(emulator);
        });

        emulator.add_listener("emulator-stopped", () => {
          setStatus("Stopped");
          setRunning(false);
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "The emulator could not load the requested resources.";
        setErrorMessage(message);
        setStatus("Could not start");
      }
    })();

    return () => {
      cancelled = true;
      globalThis.clearInterval(shellTimer.current);
      detachVolume?.();
      const emulator = emulatorRef.current;
      emulatorRef.current = null;

      if (emulator) {
        void emulator.stop().catch(() => undefined);
        emulator.destroy();
      }

      container.replaceChildren();
    };
  }, [
    diskFile,
    hasDiskImage,
  ]);

  const refreshShared = () => {
    setSharedFiles([...(emulatorRef.current?.fs9p?.read_dir("/") ?? [])].sort((a, b) => a.localeCompare(b)));
  };

  const addSharedFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !emulatorRef.current) return;
    if (file.size > SHARED_FILE_LIMIT_BYTES) {
      setErrorMessage(`${file.name} is too big to share. The limit is 64 MB.`);
      return;
    }
    setErrorMessage(null);
    await emulatorRef.current.create_file(`/${sharedFileName(file.name)}`, new Uint8Array(await file.arrayBuffer()));
    refreshShared();
  };

  const downloadShared = async (name: string) => {
    const data = await emulatorRef.current?.read_file(`/${name}`).catch(() => null);
    if (!data) {
      setErrorMessage(`${name} could not be read. Folders cannot be downloaded.`);
      return;
    }
    const url = URL.createObjectURL(new Blob([data.slice()]));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppScaffold className="v86-app">
      <MediaToolbar
        title={diskFile ? getBaseName(diskFile.path) : "Virtual x86"}
        subtitle={status}
        actions={
          <>
            <button
              type="button"
              className="ghost-button"
              aria-pressed={sharedOpen}
              disabled={!running}
              onClick={() => {
                setSharedOpen((open) => !open);
                refreshShared();
              }}
            >
              <FolderSync size={15} />
              Shared folder
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() =>
                launchApp({
                  appId: "files",
                  payload: { directoryPath: "/Desktop" },
                })
              }
            >
              <FolderOpen size={15} />
              Open Explorer
            </button>
            <button
              type="button"
              className="pill-button"
              disabled={!running}
              onClick={restart}
            >
              <RotateCcw size={15} />
              Restart
            </button>
          </>
        }
      />

      <AppContent className="v86-app__content" padded={false} scrollable={false}>
        {sharedOpen ? (
          <section className="v86-app__shared" aria-label="Shared folder">
            <div className="v86-app__shared-head">
              <span>
                Shows up in Linux as <code>/mnt</code>
              </span>
              <button type="button" className="ghost-button" onClick={() => uploadRef.current?.click()}>
                <Upload size={14} />
                Add a file
              </button>
              <button type="button" className="ghost-button" aria-label="Refresh shared folder" title="Refresh" onClick={refreshShared}>
                <RefreshCw size={14} />
              </button>
              <input ref={uploadRef} type="file" hidden aria-label="File to share" onChange={(event) => void addSharedFile(event)} />
            </div>
            {sharedFiles.length > 0 ? (
              <ul>
                {sharedFiles.map((name) => (
                  <li key={name}>
                    <span>{name}</span>
                    <button type="button" className="ghost-button" aria-label={`Download ${name}`} title="Download" onClick={() => void downloadShared(name)}>
                      <Download size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Empty. Add a file here, or write one to /mnt in Linux and refresh.</p>
            )}
          </section>
        ) : null}

        {!hasDiskImage ? (
          <div className="v86-app__empty">
            <strong>No disk image selected</strong>
            <p>Import a `.img` or `.iso` into Explorer, then open it to boot a single isolated session.</p>
          </div>
        ) : (
          <div ref={stageRef} className="v86-app__stage">
            <div ref={screenRef} className="v86-app__screen" />
          </div>
        )}

        {errorMessage ? (
          <div className="v86-app__error">
            <strong>Virtual x86 hit a problem</strong>
            <p>{errorMessage}</p>
          </div>
        ) : null}
      </AppContent>
    </AppScaffold>
  );
}
