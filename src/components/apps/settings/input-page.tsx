import { Keyboard, Mouse } from "lucide-react";
import { SettingsGroup, SettingsRow } from "@/components/apps/settings/settings-controls";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SHORTCUT_GROUPS } from "@/components/system/shortcut-cheatsheet";

/** The shortcuts come from the same list as the ? cheatsheet, so the two cannot disagree. */
export function InputPage() {
  const finePointer = useMediaQuery("(pointer: fine)");
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const canHover = useMediaQuery("(hover: hover)");
  const touchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints;

  return (
    <>
      <SettingsGroup title="Pointer and touch">
        <SettingsRow
          icon={<Mouse size={18} />}
          settingId="pointer"
          title="Primary pointer"
          description={
            coarsePointer ? "Touch (coarse)" : finePointer ? "Mouse or trackpad (fine)" : "Not reported by this browser"
          }
        />
        <SettingsRow title="Hover" description={canHover ? "The main pointer can hover over things." : "The main pointer cannot hover."} />
        <SettingsRow
          title="Touch points"
          description={touchPoints > 0 ? `Up to ${touchPoints} at once` : "No touch screen detected"}
        />
      </SettingsGroup>

      {SHORTCUT_GROUPS.map((group, index) => (
        <SettingsGroup key={group.title} title={index === 0 ? `Keyboard shortcuts: ${group.title}` : group.title}>
          {group.shortcuts.map((shortcut, row) => (
            <SettingsRow
              key={shortcut.label}
              icon={index === 0 && row === 0 ? <Keyboard size={18} /> : undefined}
              settingId={index === 0 && row === 0 ? "shortcuts" : undefined}
              title={shortcut.label}
            >
              <span className="w11-settings__keys">
                {shortcut.keys.map((key) => (
                  <kbd key={key} className="cheatsheet__kbd">
                    {key}
                  </kbd>
                ))}
              </span>
            </SettingsRow>
          ))}
        </SettingsGroup>
      ))}
    </>
  );
}
