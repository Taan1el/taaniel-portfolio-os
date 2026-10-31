import { useEffect, useRef, useState } from "react";
import { Clock3, Database, Download, FolderClock, Globe, Upload } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import { SettingsGroup, SettingsRow } from "@/components/apps/settings/settings-controls";
import { listIndexedDatabases, listLocalStorage, type LocalStorageEntry } from "@/lib/local-data";
import { buildSettingsExport, parseSettingsImport } from "@/lib/settings-transfer";
import { formatBytes } from "@/lib/utils";
import { useBrowserStore } from "@/stores/browser-store";
import { useRecentFilesStore } from "@/stores/recent-files-store";
import { getSystemSettings, useSystemSettingsStore } from "@/stores/system-settings-store";
import { toast } from "@/stores/toast-store";

const EXPORT_FILE_NAME = "taaniel-os-settings.json";

function readStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** What this site keeps on the device, with the controls to clear history and to move settings in and out. */
export function PrivacyPage() {
  const recentCount = useRecentFilesStore((state) => state.recentPaths.length);
  const clearRecent = useRecentFilesStore((state) => state.clearRecent);
  const historyCount = useBrowserStore((state) => state.history.length);
  const clearHistory = useBrowserStore((state) => state.clearHistory);
  const applySettings = useSystemSettingsStore((state) => state.applySettings);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [stored, setStored] = useState<LocalStorageEntry[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [importNote, setImportNote] = useState("");

  // Counts change when history is cleared, so read the keys again then too.
  useEffect(() => {
    setStored(listLocalStorage(readStorage()));
  }, [recentCount, historyCount, importNote]);

  useEffect(() => {
    let alive = true;
    void listIndexedDatabases(typeof indexedDB === "undefined" ? null : indexedDB).then((names) => alive && setDatabases(names));
    return () => {
      alive = false;
    };
  }, []);

  const exportSettings = () => {
    const url = URL.createObjectURL(new Blob([buildSettingsExport(getSystemSettings())], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = EXPORT_FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (file: File | undefined) => {
    if (!file) return;

    const result = parseSettingsImport(await file.text());

    if (result.ok) {
      applySettings(result.values);
      setImportNote(`Imported ${result.count} setting${result.count === 1 ? "" : "s"} from ${file.name}.`);
      toast("Settings imported", "success");
    } else {
      setImportNote(result.error);
    }
  };

  const totalBytes = stored.reduce((sum, entry) => sum + entry.bytes, 0);

  return (
    <>
      <SettingsGroup title="History">
        <SettingsRow
          icon={<FolderClock size={18} />}
          settingId="recent-files"
          title="Recent files"
          description={recentCount === 0 ? "No recent files." : `${recentCount} file${recentCount === 1 ? "" : "s"} listed in Start.`}
        >
          <Button type="button" variant="panel" disabled={recentCount === 0} onClick={clearRecent}>
            Clear
          </Button>
        </SettingsRow>
        <SettingsRow
          icon={<Globe size={18} />}
          settingId="browser-history"
          title="Browsing history"
          description={historyCount === 0 ? "The Browser has no history." : `${historyCount} page${historyCount === 1 ? "" : "s"} visited in the Browser app.`}
        >
          <Button type="button" variant="panel" disabled={historyCount === 0} onClick={clearHistory}>
            Clear
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Your settings">
        <SettingsRow
          icon={<Download size={18} />}
          settingId="export-settings"
          title="Export settings"
          description={`Saves the settings on these pages to ${EXPORT_FILE_NAME}.`}
        >
          <Button type="button" variant="panel" onClick={exportSettings}>
            Export
          </Button>
        </SettingsRow>
        <SettingsRow
          icon={<Upload size={18} />}
          settingId="import-settings"
          title="Import settings"
          description={importNote || "Loads a file made by Export. Each value is checked before it is used."}
        >
          <Button type="button" variant="panel" onClick={() => fileInput.current?.click()}>
            Import
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Settings file"
            onChange={(event) => {
              void importSettings(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Stored on this device">
        <SettingsRow
          icon={<Database size={18} />}
          settingId="local-data"
          title="Data stored on this device"
          description={`Nothing leaves your browser. ${stored.length} local storage key${stored.length === 1 ? "" : "s"}, ${formatBytes(totalBytes)}. Clearing the site data in your browser removes all of it.`}
        />
        {stored.map((entry) => (
          <SettingsRow key={entry.key} className="is-nested" title={entry.label} description={entry.key === entry.label ? undefined : entry.key}>
            <span className="w11-settings__figure">{formatBytes(entry.bytes)}</span>
          </SettingsRow>
        ))}
        <SettingsRow
          icon={<Clock3 size={18} />}
          title="IndexedDB"
          description={
            databases.length > 0
              ? `${databases.join(", ")}. Holds the virtual file system (files, folders, Recycle Bin).`
              : "No databases listed. The file system may not have been saved yet, or this browser cannot list them."
          }
        />
      </SettingsGroup>
    </>
  );
}
