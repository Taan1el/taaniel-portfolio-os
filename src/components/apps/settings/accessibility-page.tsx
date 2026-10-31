import { Contrast, Keyboard, Sparkles, Type } from "lucide-react";
import { SettingsGroup, SettingsRow, ToggleSwitch } from "@/components/apps/settings/settings-controls";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TEXT_SIZES, useSystemSettingsStore } from "@/stores/system-settings-store";

/**
 * Accessibility preferences. Text size scales app windows; contrast turns off
 * see-through surfaces. Both are applied by useShellServices.
 */
export function AccessibilityPage() {
  const reduceMotion = useSystemSettingsStore((state) => state.reduceMotion);
  const setReduceMotion = useSystemSettingsStore((state) => state.setReduceMotion);
  const systemReducesMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const textSize = useSystemSettingsStore((state) => state.textSize);
  const setTextSize = useSystemSettingsStore((state) => state.setTextSize);
  const moreContrast = useSystemSettingsStore((state) => state.moreContrast);
  const setMoreContrast = useSystemSettingsStore((state) => state.setMoreContrast);

  return (
    <>
    <SettingsGroup title="Vision">
      <SettingsRow icon={<Type size={18} />} title="Text size" description="Makes everything inside app windows larger.">
        <select aria-label="Text size" value={textSize} onChange={(event) => setTextSize(Number(event.target.value))}>
          {TEXT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}%
            </option>
          ))}
        </select>
      </SettingsRow>
      <SettingsRow icon={<Contrast size={18} />} title="More contrast" description="Solid surfaces with stronger text and borders.">
        <ToggleSwitch label="More contrast" checked={moreContrast} onChange={setMoreContrast} />
      </SettingsRow>
    </SettingsGroup>
    <SettingsGroup title="Visual effects">
      <SettingsRow
        icon={<Sparkles size={18} />}
        title="Animation effects"
        description={
          systemReducesMotion && !reduceMotion
            ? "Your device already asks for reduced motion, so animations stay off here too."
            : "Play animations as windows and menus open, close and move."
        }
      >
        {/* The store keeps the preference as "reduce motion"; the switch reads as "animations on". */}
        <ToggleSwitch label="Animation effects" checked={!reduceMotion} onChange={(on) => setReduceMotion(!on)} />
      </SettingsRow>
    </SettingsGroup>
    <SettingsGroup title="Keyboard">
      <SettingsRow icon={<Keyboard size={18} />} title="Keyboard shortcuts" description="Press ? on the desktop to see them all. Start, menus, windows and dialogs all work without a mouse." />
    </SettingsGroup>
    </>
  );
}
