import { useMemo, useState } from "react";
import { FileType2 } from "lucide-react";
import { Button, SearchInput } from "@/components/apps/app-layout";
import { SettingsGroup, SettingsRow } from "@/components/apps/settings/settings-controls";
import { getAppDefinition, getAppRegistry } from "@/lib/app-registry";
import { getFileAssociationDescriptor, getKnownExtensions, getOpenWithOptionsForExtension } from "@/lib/file-registry";
import { useSystemSettingsStore } from "@/stores/system-settings-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppId } from "@/types/system";

/** File types that more than one app can open, so there is a real choice to make. */
function getChoosableExtensions() {
  return getKnownExtensions().filter((extension) => getOpenWithOptionsForExtension(extension).length > 1);
}

/** Every app in the OS, and which app opens each kind of file. */
export function AppsPage() {
  const [query, setQuery] = useState("");
  const launchApp = useSystemStore((state) => state.launchApp);
  const defaultApps = useSystemSettingsStore((state) => state.defaultApps);
  const setDefaultApp = useSystemSettingsStore((state) => state.setDefaultApp);
  const apps = useMemo(() => getAppRegistry().slice().sort((a, b) => a.title.localeCompare(b.title)), []);
  const extensions = useMemo(getChoosableExtensions, []);
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? apps.filter((app) => `${app.title} ${app.description} ${app.category}`.toLowerCase().includes(needle))
    : apps;

  return (
    <>
      <SettingsGroup title="Installed apps">
        <div className="w11-settings__search-row" data-setting-id="installed-apps">
          <SearchInput
            aria-label="Search apps"
            placeholder="Search apps"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="w11-settings__count">
            {shown.length} of {apps.length}
          </span>
        </div>
        {shown.map((app) => {
          const Icon = app.icon;

          return (
            <SettingsRow key={app.id} icon={<Icon size={22} />} title={app.title} description={`${app.category}. ${app.description}`}>
              <Button type="button" variant="panel" aria-label={`Open ${app.title}`} onClick={() => launchApp({ appId: app.id })}>
                Open
              </Button>
            </SettingsRow>
          );
        })}
        {shown.length === 0 ? <SettingsRow title="No apps match" description={`Nothing is called "${query.trim()}".`} /> : null}
      </SettingsGroup>

      <SettingsGroup title="Default apps">
        <SettingsRow
          settingId="default-apps"
          title="Choose the app for each file type"
          description="Opening a file of that type, from the desktop or File Explorer, uses the app you pick."
        />
        {extensions.map((extension) => {
          const options = getOpenWithOptionsForExtension(extension);
          const builtIn = options[0];
          const current = defaultApps[extension] ?? builtIn;
          const label = getFileAssociationDescriptor(extension)?.label ?? extension;

          return (
            <SettingsRow key={extension} icon={<FileType2 size={18} />} title={extension} description={label}>
              <select
                aria-label={`Default app for ${extension}`}
                value={current}
                onChange={(event) => {
                  const next = event.target.value as AppId;
                  setDefaultApp(extension, next === builtIn ? null : next);
                }}
              >
                {options.map((id) => (
                  <option key={id} value={id}>
                    {getAppDefinition(id)?.title ?? id}
                    {id === builtIn ? " (built in)" : ""}
                  </option>
                ))}
              </select>
            </SettingsRow>
          );
        })}
      </SettingsGroup>
    </>
  );
}
