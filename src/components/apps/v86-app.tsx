import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, FolderOpen, RotateCcw } from "lucide-react";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { getBaseName } from "@/lib/utils";
import { getNodeByPath } from "@/lib/filesystem";
import {
  V86_BIOS_PATH,
  V86_VGA_BIOS_PATH,
  loadV86Runtime,
  resolveVirtualX86Drive,
  sourceToArrayBuffer,
} from "@/lib/v86";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";
import type { V86 as V86Instance } from "v86";

const EMULATOR_MEMORY_SIZE = 128 * 1024 * 1024;
const EMULATOR_VGA_MEMORY_SIZE = 8 * 1024 * 1024;

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

function isDiskImage(node?: VirtualFile | null) {
  return Boolean(node && ["img", "iso"].includes(node.extension.toLowerCase()) && node.source);
}

export function VirtualX86App({ window: appWindow }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const emulatorRef = useRef<V86Instance | null>(null);
  const [status, setStatus] = useState("Waiting for a disk image");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState("Runtime stays isolated until this app opens.");

  const diskFile = useMemo(() => {
    const filePath = appWindow.payload?.filePath;
    const node = filePath ? getNodeByPath(nodes, filePath) : undefined;
    return node && node.kind === "file" ? node : null;
  }, [appWindow.payload?.filePath, nodes]);
  const hasDiskImage = isDiskImage(diskFile);

  useEffect(() => {
    const container = screenRef.current;

    if (!container) {
      return;
    }

    container.replaceChildren();
    setErrorMessage(null);

    if (!hasDiskImage || !diskFile?.source) {
      setBooting(false);
      setStatus("Open a .img or .iso from Explorer to start an experimental boot session.");
      return;
    }

    const diskSource = diskFile.source;
    let cancelled = false;
    setBooting(true);
    setStatus("Loading experimental runtime...");
    setRuntimeStatus("Loading the emulator only for this window.");

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
          memory_size: EMULATOR_MEMORY_SIZE,
          vga_memory_size: EMULATOR_VGA_MEMORY_SIZE,
          screen_container: screenRef.current,
          bios: { buffer: bios },
          vga_bios: { buffer: vgaBios },
          [drive]: {
            buffer: diskBuffer,
            size: diskFile.size ?? diskBuffer.byteLength,
          },
        });

        emulatorRef.current = emulator;

        emulator.add_listener("emulator-ready", () => {
          void (async () => {
            try {
              setStatus("Booting selected disk image...");
              if (cancelled) {
                return;
              }

              await emulator.run();
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "The imported disk image could not be booted.";
              setErrorMessage(message);
              setStatus("Boot failed");
              setBooting(false);
            }
          })();
        });

        emulator.add_listener("emulator-started", () => {
          setStatus("Running experimental session");
          setRuntimeStatus("The emulator is isolated to this app window and loads on demand.");
          setBooting(false);
        });

        emulator.add_listener("emulator-stopped", () => {
          setStatus("Stopped");
          setBooting(false);
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "The emulator could not load the requested resources.";
        setErrorMessage(message);
        setStatus("Unable to start Virtual x86");
        setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
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

  return (
    <AppScaffold className="v86-app">
      <MediaToolbar
        title={diskFile ? getBaseName(diskFile.path) : "Virtual x86"}
        subtitle="Experimental x86 boot environment"
        actions={
          <>
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
              disabled={!emulatorRef.current}
              onClick={() => emulatorRef.current?.restart()}
            >
              <RotateCcw size={15} />
              Restart
            </button>
          </>
        }
      />

      <AppContent className="v86-app__content" padded={false} scrollable={false}>
        <div className="glass-card v86-app__hero">
          <span className="v86-app__hero-icon">
            <Cpu size={24} />
          </span>
          <div className="v86-app__hero-copy">
            <p className="eyebrow">Virtual x86</p>
            <h2>{diskFile ? diskFile.name : "Import a disk image to begin"}</h2>
            <p>{status}</p>
          </div>
        </div>

        <div className="v86-app__status-row">
          <span>{runtimeStatus}</span>
          <small>Basic launch only. Save states and advanced media workflows stay deferred.</small>
        </div>

        {!hasDiskImage ? (
          <div className="v86-app__empty">
            <strong>No disk image selected</strong>
            <p>Import a `.img` or `.iso` into Explorer, then open it to boot a single isolated session.</p>
          </div>
        ) : (
          <div className="v86-app__viewport">
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
