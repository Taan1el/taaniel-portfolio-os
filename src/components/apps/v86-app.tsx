import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, FolderOpen, Play, RotateCcw, Save } from "lucide-react";
import { V86 } from "v86";
import { MediaToolbar } from "@/components/apps/media-toolbar";
import { clamp, getBaseName } from "@/lib/utils";
import { getNodeByPath } from "@/lib/filesystem";
import {
  SNAPSHOTS_DIRECTORY_PATH,
} from "@/lib/system-workspace";
import {
  V86_BIOS_PATH,
  V86_VGA_BIOS_PATH,
  arrayBufferToDataUrl,
  getVirtualX86SnapshotPath,
  resolveVirtualX86Drive,
  resolveVirtualX86ViewportSize,
  sourceToArrayBuffer,
} from "@/lib/v86";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, VirtualFile } from "@/types/system";

const EMULATOR_MEMORY_SIZE = 128 * 1024 * 1024;
const EMULATOR_VGA_MEMORY_SIZE = 8 * 1024 * 1024;
const TASKBAR_SAFE_HEIGHT = 118;

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
  const createBinaryFile = useFileSystemStore((state) => state.createBinaryFile);
  const updateBinaryFile = useFileSystemStore((state) => state.updateBinaryFile);
  const launchApp = useSystemStore((state) => state.launchApp);
  const updateWindowBounds = useSystemStore((state) => state.updateWindowBounds);
  const currentWindow = useSystemStore((state) => state.windows.find((item) => item.id === appWindow.id));
  const screenRef = useRef<HTMLDivElement | null>(null);
  const emulatorRef = useRef<V86 | null>(null);
  const latestWindowRef = useRef(currentWindow);
  const [status, setStatus] = useState("Waiting for a disk image");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Snapshots save automatically on close.");

  latestWindowRef.current = currentWindow;

  const diskFile = useMemo(() => {
    const filePath = appWindow.payload?.filePath;
    const node = filePath ? getNodeByPath(nodes, filePath) : undefined;
    return node && node.kind === "file" ? node : null;
  }, [appWindow.payload?.filePath, nodes]);
  const snapshotPath = diskFile ? getVirtualX86SnapshotPath(diskFile.path) : null;
  const snapshotFile = useMemo(() => {
    const node = snapshotPath ? getNodeByPath(nodes, snapshotPath) : undefined;
    return node && node.kind === "file" ? node : null;
  }, [nodes, snapshotPath]);
  const hasDiskImage = isDiskImage(diskFile);

  const persistSnapshot = async (instance = emulatorRef.current) => {
    const emulator = instance;

    if (!emulator || !diskFile || !snapshotPath) {
      return;
    }

    setSaving(true);
    setSaveMessage("Saving emulator snapshot...");

    try {
      const snapshotBuffer = await emulator.save_state();
      const snapshotSource = await arrayBufferToDataUrl(snapshotBuffer, "application/octet-stream");
      const snapshotName = `${getBaseName(diskFile.path).replace(/\.[^.]+$/, "")}.v86state`;

      const currentSnapshot = snapshotPath
        ? getNodeByPath(useFileSystemStore.getState().nodes, snapshotPath)
        : undefined;

      if (currentSnapshot && currentSnapshot.kind === "file") {
        await updateBinaryFile(snapshotPath, snapshotSource, {
          mimeType: "application/octet-stream",
          extension: "v86state",
        });
      } else {
        await createBinaryFile(
          SNAPSHOTS_DIRECTORY_PATH,
          snapshotName,
          snapshotSource,
          "application/octet-stream",
          "v86state"
        );
      }

      setSaveMessage(`Saved snapshot to ${snapshotPath}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The emulator state could not be written to the virtual filesystem.";
      setErrorMessage(message);
      setSaveMessage("Automatic save failed.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const container = screenRef.current;

    if (!container) {
      return;
    }

    container.replaceChildren();
    setErrorMessage(null);

    if (!hasDiskImage || !diskFile?.source) {
      setStatus("Import an .img or .iso, then open it to boot Virtual x86.");
      return;
    }

    const diskSource = diskFile.source;
    let cancelled = false;
    setBooting(true);
    setStatus(snapshotFile ? "Loading saved emulator state..." : "Loading virtual hardware...");

    const destroyInstance = async (shouldPersist: boolean) => {
      const emulator = emulatorRef.current;
      emulatorRef.current = null;

      if (!emulator) {
        return;
      }

      if (shouldPersist) {
        await persistSnapshot(emulator);
      }

      emulator.destroy();
      container.replaceChildren();
    };

    void (async () => {
      try {
        const [{ bios, vgaBios }, diskBuffer, snapshotBuffer] = await Promise.all([
          loadBiosBuffers(),
          sourceToArrayBuffer(diskSource),
          snapshotFile?.source ? sourceToArrayBuffer(snapshotFile.source) : Promise.resolve(null),
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
              setStatus(snapshotBuffer ? "Restoring saved session..." : "Booting disk image...");

              if (snapshotBuffer) {
                try {
                  await emulator.restore_state(snapshotBuffer);
                } catch {
                  setSaveMessage("Saved state was incompatible, so the disk booted fresh.");
                }
              }

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
          setStatus(snapshotBuffer ? "Running from saved state" : "Running");
          setBooting(false);
        });

        emulator.add_listener("emulator-stopped", () => {
          setStatus("Stopped");
        });

        emulator.add_listener("screen-set-size", (size: [number, number, number]) => {
          const [width, height, bpp] = size;
          const latestWindow = latestWindowRef.current;

          if (!latestWindow || latestWindow.maximized) {
            return;
          }

          const nextSize = resolveVirtualX86ViewportSize(width, height, bpp);
          const clampedWidth = clamp(
            nextSize.frameWidth,
            620,
            Math.max(620, globalThis.window.innerWidth - 24)
          );
          const clampedHeight = clamp(
            nextSize.frameHeight,
            440,
            Math.max(440, globalThis.window.innerHeight - TASKBAR_SAFE_HEIGHT)
          );
          const nextX = clamp(
            latestWindow.x,
            8,
            Math.max(8, globalThis.window.innerWidth - clampedWidth - 8)
          );
          const nextY = clamp(
            latestWindow.y,
            8,
            Math.max(8, globalThis.window.innerHeight - TASKBAR_SAFE_HEIGHT - clampedHeight + 16)
          );

          updateWindowBounds(appWindow.id, {
            x: nextX,
            y: nextY,
            width: clampedWidth,
            height: clampedHeight,
          });
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
      void destroyInstance(true);
    };
  }, [
    createBinaryFile,
    diskFile,
    hasDiskImage,
    updateBinaryFile,
    updateWindowBounds,
    appWindow.id,
  ]);

  return (
    <div className="app-screen v86-app">
      <MediaToolbar
        title={diskFile ? getBaseName(diskFile.path) : "Virtual x86"}
        subtitle={snapshotFile ? "Snapshot-aware emulator session" : "In-browser x86 emulator"}
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
              disabled={!emulatorRef.current || saving}
              onClick={() => void persistSnapshot()}
            >
              <Save size={15} />
              Save state
            </button>
            <button
              type="button"
              className="pill-button"
              disabled={!emulatorRef.current || booting}
              onClick={() => emulatorRef.current?.restart()}
            >
              <RotateCcw size={15} />
              Restart
            </button>
            <button
              type="button"
              className="pill-button"
              disabled={!emulatorRef.current || booting}
              onClick={() => {
                void emulatorRef.current?.run();
                setStatus("Resuming");
              }}
            >
              <Play size={15} />
              Resume
            </button>
          </>
        }
      />

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
        <span>{saveMessage}</span>
        <small>Snapshots live in `{SNAPSHOTS_DIRECTORY_PATH}`.</small>
      </div>

      {!hasDiskImage ? (
        <div className="v86-app__empty">
          <strong>No disk image is mounted</strong>
          <p>Import a `.img` or `.iso` into Explorer or onto the desktop, then open it to launch Virtual x86.</p>
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
    </div>
  );
}
