import { useMemo } from "react";
import { SETTINGS_SECTION_ICONS } from "@/components/apps/settings/section-icons";
import { SettingsGroup, SettingsLinkRow } from "@/components/apps/settings/settings-controls";
import { themePresets } from "@/data/portfolio";
import { useTrayReadings } from "@/hooks/use-tray-readings";
import { describeSettingsStatus } from "@/lib/settings-overview";
import { getSettingsSection, type SettingsSectionId } from "@/lib/settings-sections";
import { useSystemSettingsStore } from "@/stores/system-settings-store";
import { useSystemStore } from "@/stores/system-store";

const DEVICE_SECTIONS: SettingsSectionId[] = ["display", "sound", "power", "network"];
const PERSONAL_SECTIONS: SettingsSectionId[] = ["personalization", "accessibility", "time"];

/** The Settings home page: every other page, with a live line saying how it is set right now. */
export function SystemPage({ onOpen }: { onOpen: (section: SettingsSectionId) => void }) {
  const readings = useTrayReadings();
  const brightness = useSystemSettingsStore((state) => state.brightness);
  const reduceMotion = useSystemSettingsStore((state) => state.reduceMotion);
  const themeId = useSystemStore((state) => state.themeId);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const themeName = (themePresets.find((preset) => preset.id === themeId) ?? themePresets[0]).name;
  const input = { readings, brightness, reduceMotion, themeName, timeZone };

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
    </>
  );
}
