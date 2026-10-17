import { Sparkles } from "lucide-react";
import { SettingsGroup, SettingsRow, ToggleSwitch } from "@/components/apps/settings/settings-controls";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

/**
 * Accessibility preferences. Only visual effects for now; the groups below are
 * the place to add vision, hearing and interaction options.
 */
export function AccessibilityPage() {
  const reduceMotion = useSystemSettingsStore((state) => state.reduceMotion);
  const setReduceMotion = useSystemSettingsStore((state) => state.setReduceMotion);
  const systemReducesMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
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
  );
}
