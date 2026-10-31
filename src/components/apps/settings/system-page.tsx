import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { SETTINGS_SECTION_ICONS } from "@/components/apps/settings/section-icons";
import { SettingsGroup, SettingsLinkRow } from "@/components/apps/settings/settings-controls";
import { themePresets } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import { OS_VERSION } from "@/lib/os-info";
import { useTrayReadings } from "@/hooks/use-tray-readings";
import { describeSettingsStatus } from "@/lib/settings-overview";
import { getSettingsSection, type SettingsSectionId } from "@/lib/settings-sections";
import { useSystemSettingsStore } from "@/stores/system-settings-store";
import { useSystemStore } from "@/stores/system-store";

const DEVICE_SECTIONS: SettingsSectionId[] = ["display", "sound", "notifications", "power", "storage", "network"];
const PERSONAL_SECTIONS: SettingsSectionId[] = ["personalization", "apps", "accessibility", "time", "input"];
const SYSTEM_SECTIONS: SettingsSectionId[] = ["privacy", "about"];

/** The Settings home page: every other page, with a live line saying how it is set right now. */
export function SystemPage({ onOpen }: { onOpen: (section: SettingsSectionId) => void }) {
  const readings = useTrayReadings();
  const brightness = useSystemSettingsStore((state) => state.brightness);
  const reduceMotion = useSystemSettingsStore((state) => state.reduceMotion);
  const doNotDisturb = useSystemSettingsStore((state) => state.doNotDisturb);
  const launchApp = useSystemStore((state) => state.launchApp);
  const themeId = useSystemStore((state) => state.themeId);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const themeName = (themePresets.find((preset) => preset.id === themeId) ?? themePresets[0]).name;
  const input = {
    readings,
    brightness,
    reduceMotion,
    themeName,
    timeZone,
    doNotDisturb,
    appCount: getAppRegistry().length,
    osVersion: OS_VERSION,
  };

  const renderLink = (id: SettingsSectionId) => {
    const Icon = SETTINGS_SECTION_ICONS[id];

    return (
      <SettingsLinkRow
        key={id}
        icon={<Icon size={18} />}
        title={getSettingsSection(id).title}
        description={describeSettingsStatus(id, input) || getSettingsSection(id).description}
        onOpen={() => onOpen(id)}
      />
    );
  };

  return (
    <>
      <SettingsGroup title="Device">{DEVICE_SECTIONS.map(renderLink)}</SettingsGroup>
      <SettingsGroup title="Personalize">{PERSONAL_SECTIONS.map(renderLink)}</SettingsGroup>
      <SettingsGroup title="System">
        {SYSTEM_SECTIONS.map(renderLink)}
        <SettingsLinkRow
          icon={<Trophy size={18} />}
          title="Achievements"
          description="Things you have found in Taaniel OS"
          onOpen={() => launchApp({ appId: "achievements" })}
        />
      </SettingsGroup>
    </>
  );
}
