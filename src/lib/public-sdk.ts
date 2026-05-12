/**
 * Public SDK exposed on `window.taanielOS`.
 *
 * Lets visitors (and recruiters poking at devtools) drive the OS shell
 * programmatically without touching Zustand internals. Inspired by Puter's
 * public app API (https://docs.puter.com/) — small, stable surface that
 * delegates to the same stores the in-app UI uses.
 */
import { getAppRegistry, getAppDefinition } from "@/lib/app-registry";
import { acceptsExtension, getAcceptedExtensionsForApp } from "@/lib/file-registry";
import { openFileSystemPath, editFileSystemPath } from "@/lib/launchers";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppId, WindowPayload } from "@/types/system";

interface LaunchAppArgs {
  appId: AppId;
  payload?: WindowPayload;
  title?: string;
}

export interface TaanielOSPublicSdk {
  /** Version of the public SDK surface. Bump on breaking changes. */
  readonly version: string;
  /** Launch any app by id. Returns the new window id. */
  launchApp: (args: LaunchAppArgs) => string;
  /** Open a virtual filesystem path with its default app. */
  openPath: (path: string) => void;
  /** Open a virtual filesystem path in its registered editor. */
  editPath: (path: string) => void;
  /** List installed apps (id, title, category, accent). */
  listApps: () => Array<{ id: AppId; title: string; category: string; accent: string }>;
  /** List file extensions an app accepts (`.png`, `.mp3`, etc.). */
  acceptedExtensions: (appId: AppId) => string[];
  /** True if an app accepts a given extension. */
  accepts: (appId: AppId, extension: string) => boolean;
  /** Close every open window. */
  closeAll: () => void;
  /** Print a friendly help banner to the console. */
  help: () => void;
}

const SDK_VERSION = "1.0.0";

function buildSdk(): TaanielOSPublicSdk {
  return {
    version: SDK_VERSION,

    launchApp({ appId, payload, title }) {
      const def = getAppDefinition(appId);
      if (!def) {
        throw new Error(`taanielOS.launchApp: unknown appId "${appId}"`);
      }
      return useSystemStore.getState().launchApp({ appId, payload, title });
    },

    openPath(path) {
      const nodes = useFileSystemStore.getState().nodes;
      const launchApp = useSystemStore.getState().launchApp;
      openFileSystemPath(path, nodes, launchApp);
    },

    editPath(path) {
      const nodes = useFileSystemStore.getState().nodes;
      const launchApp = useSystemStore.getState().launchApp;
      editFileSystemPath(path, nodes, launchApp);
    },

    listApps() {
      return getAppRegistry().map((app) => ({
        id: app.id,
        title: app.title,
        category: app.category,
        accent: app.accent,
      }));
    },

    acceptedExtensions(appId) {
      return getAcceptedExtensionsForApp(appId);
    },

    accepts(appId, extension) {
      return acceptsExtension(appId, extension);
    },

    closeAll() {
      const state = useSystemStore.getState();
      for (const w of state.windows) state.closeWindow(w.id);
    },

    help() {
      // eslint-disable-next-line no-console
      console.log(
        `%ctaanielOS v${SDK_VERSION}%c\n\n` +
          `  taanielOS.launchApp({ appId, payload?, title? })\n` +
          `  taanielOS.openPath("/Media/Music/Black Star.mp3")\n` +
          `  taanielOS.editPath("/Documents/Notes.md")\n` +
          `  taanielOS.listApps()\n` +
          `  taanielOS.closeAll()\n\n` +
          `Try: taanielOS.launchApp({ appId: "music" })`,
        "font-weight:600;color:#77c7ff;",
        "color:inherit;"
      );
    },
  };
}

/**
 * Install the SDK on `window.taanielOS`. Safe to call more than once —
 * later calls replace the previous instance (useful in HMR).
 */
export function installPublicSdk() {
  if (typeof window === "undefined") return;
  const sdk = buildSdk();
  (window as unknown as { taanielOS: TaanielOSPublicSdk }).taanielOS = sdk;

  // One-time hint banner on first install so curious visitors find it.
  if (!(window as unknown as { __taanielOSAnnounced?: boolean }).__taanielOSAnnounced) {
    (window as unknown as { __taanielOSAnnounced: boolean }).__taanielOSAnnounced = true;
    // eslint-disable-next-line no-console
    console.log(
      `%ctaanielOS%c — type %ctaanielOS.help()%c for the public API.`,
      "font-weight:600;color:#77c7ff;",
      "color:inherit;",
      "font-family:monospace;background:rgba(119,199,255,0.12);padding:0 4px;border-radius:4px;",
      "color:inherit;"
    );
  }
}

declare global {
  interface Window {
    taanielOS?: TaanielOSPublicSdk;
  }
}
