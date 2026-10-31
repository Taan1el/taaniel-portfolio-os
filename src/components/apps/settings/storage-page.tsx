import { useEffect, useMemo, useState } from "react";
import { Database, HardDrive, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import { SettingsGroup, SettingsRow } from "@/components/apps/settings/settings-controls";
import { emptyRecycleBin } from "@/lib/file-actions";
import { summarizeFileSystem } from "@/lib/storage-usage";
import { TRASH_PATH } from "@/lib/system-workspace";
import { formatBytes } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";

interface BrowserStorage {
  usage?: number;
  quota?: number;
  persisted?: boolean;
}

async function readBrowserStorage(): Promise<BrowserStorage | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;

  try {
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted?.() ?? Promise.resolve(undefined),
    ]);
    return { usage: estimate.usage, quota: estimate.quota, persisted };
  } catch {
    return null;
  }
}

/** Real numbers only: the browser's own storage estimate, and the size of every file in the virtual disk. */
export function StoragePage() {
  const nodes = useFileSystemStore((state) => state.nodes);
  const [browser, setBrowser] = useState<BrowserStorage | null | undefined>(undefined);
  const [persistNote, setPersistNote] = useState("");
  const usage = useMemo(() => summarizeFileSystem(nodes), [nodes]);
  const binItems = useMemo(
    () =>
      Object.keys(nodes).filter(
        (path) => path.startsWith(`${TRASH_PATH}/`) && !path.slice(TRASH_PATH.length + 1).includes("/")
      ).length,
    [nodes]
  );

  useEffect(() => {
    let alive = true;
    void readBrowserStorage().then((value) => alive && setBrowser(value));
    return () => {
      alive = false;
    };
  }, [nodes]);

  const requestPersistence = async () => {
    try {
      const granted = await navigator.storage.persist();
      setPersistNote(
        granted
          ? "Granted. The browser will keep this data unless you clear it yourself."
          : "The browser declined. It may still keep the data."
      );
      setBrowser(await readBrowserStorage());
    } catch {
      setPersistNote("This browser cannot do that.");
    }
  };

  const percent = browser?.usage != null && browser.quota ? (browser.usage / browser.quota) * 100 : null;
  const canPersist = typeof navigator !== "undefined" && typeof navigator.storage?.persist === "function";

  return (
    <>
      <SettingsGroup title="This browser">
        <SettingsRow
          icon={<HardDrive size={18} />}
          settingId="browser-storage"
          title="Browser storage"
          description={
            browser === undefined
              ? "Reading..."
              : browser?.usage != null && browser.quota
                ? `${formatBytes(browser.usage)} used of ${formatBytes(browser.quota)} the browser allows this site (${percent! < 0.01 ? "under 0.01" : percent!.toFixed(2)}%). An estimate.`
                : "This browser does not report a storage estimate."
          }
        >
          {percent !== null ? (
            <span
              className="w11-settings__meter"
              role="meter"
              aria-label="Browser storage used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent * 100) / 100}
            >
              <span style={{ width: `${Math.max(1, Math.min(100, percent))}%` }} />
            </span>
          ) : null}
        </SettingsRow>
        {browser?.persisted !== undefined && canPersist ? (
          <SettingsRow
            icon={<Pin size={18} />}
            title="Persistent storage"
            description={
              persistNote ||
              (browser.persisted
                ? "On. The browser will not clear this data on its own."
                : "Off. The browser may clear this data when the disk is low.")
            }
          >
            {browser.persisted ? null : (
              <Button type="button" variant="panel" onClick={requestPersistence}>
                Ask the browser to keep it
              </Button>
            )}
          </SettingsRow>
        ) : null}
      </SettingsGroup>

      <SettingsGroup title="Files in Taaniel OS">
        <SettingsRow
          icon={<Database size={18} />}
          settingId="file-usage"
          title="Files by folder"
          description={`${usage.totalFiles} file${usage.totalFiles === 1 ? "" : "s"}, ${formatBytes(usage.totalBytes)} in total. Sizes are the sizes the files report.`}
        />
        {usage.folders.map((folder) => (
          <SettingsRow
            key={folder.path}
            className="is-nested"
            title={folder.name}
            description={`${folder.files} file${folder.files === 1 ? "" : "s"}`}
          >
            <span className="w11-settings__figure">{formatBytes(folder.bytes)}</span>
          </SettingsRow>
        ))}
      </SettingsGroup>

      <SettingsGroup title="Recycle Bin">
        <SettingsRow
          icon={<Trash2 size={18} />}
          settingId="recycle-bin"
          title="Empty Recycle Bin"
          description={
            binItems === 0
              ? "The Recycle Bin is empty."
              : `${binItems} item${binItems === 1 ? "" : "s"} waiting to be deleted for good.`
          }
        >
          <Button type="button" variant="panel" disabled={binItems === 0} onClick={() => void emptyRecycleBin()}>
            Empty
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
