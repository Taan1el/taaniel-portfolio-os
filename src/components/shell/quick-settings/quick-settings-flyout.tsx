import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Accessibility, ChevronRight, Leaf, MoonStar, Plane, Settings as SettingsIcon, Sun } from "lucide-react";
import { QuickTile } from "@/components/shell/quick-settings/quick-tile";
import { BatteryIcon, NetworkGlyph, VolumeIcon } from "@/components/shell/tray-glyphs";
import { RangeSlider } from "@/components/ui/range-slider";
import { useFlyout } from "@/hooks/use-flyout";
import { useTrayReadings } from "@/hooks/use-tray-readings";
import { describeWifiTile } from "@/lib/device-status";
import type { SettingsSectionId } from "@/lib/settings-sections";
import { useDeviceStore } from "@/stores/device-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

interface QuickSettingsFlyoutProps {
  onOpenSettings: (section: SettingsSectionId) => void;
}

/**
 * Windows 11's Quick Settings: toggle tiles for the radios, power and display
 * switches, a brightness slider, the master volume, and the battery. Every
 * control is live, backed by the persisted settings store and the session-only
 * device store.
 */
export function QuickSettingsFlyout({ onOpenSettings }: QuickSettingsFlyoutProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => useShellStore.getState().setQuickSettingsOpen(false), []);
  useFlyout({ open: true, triggerId: "quick-settings", panelRef, onClose: close });

  const readings = useTrayReadings();
  const wifiEnabled = useDeviceStore((state) => state.wifiEnabled);
  const airplaneMode = useDeviceStore((state) => state.airplaneMode);
  const toggleWifi = useDeviceStore((state) => state.toggleWifi);
  const toggleAirplaneMode = useDeviceStore((state) => state.toggleAirplaneMode);

  const brightness = useSystemSettingsStore((state) => state.brightness);
  const volume = useSystemSettingsStore((state) => state.volume);
  const muted = useSystemSettingsStore((state) => state.muted);
  const nightLight = useSystemSettingsStore((state) => state.nightLight);
  const batterySaver = useSystemSettingsStore((state) => state.batterySaver);
  const reduceMotion = useSystemSettingsStore((state) => state.reduceMotion);
  const setBrightness = useSystemSettingsStore((state) => state.setBrightness);
  const setVolume = useSystemSettingsStore((state) => state.setVolume);
  const toggleMuted = useSystemSettingsStore((state) => state.toggleMuted);
  const toggleNightLight = useSystemSettingsStore((state) => state.toggleNightLight);
  const toggleBatterySaver = useSystemSettingsStore((state) => state.toggleBatterySaver);
  const setReduceMotion = useSystemSettingsStore((state) => state.setReduceMotion);

  const { network, battery } = readings;

  return (
    <motion.div
      ref={panelRef}
      className="w11-flyout w11-quick"
      role="dialog"
      aria-label="Quick settings"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.18, ease: [0, 0, 0, 1] }}
    >
      <div className="w11-quick__tiles">
        <QuickTile
          icon={<NetworkGlyph status={network.status} strength={network.strength} size={18} />}
          label="Wi-Fi"
          status={describeWifiTile(network.status)}
          pressed={wifiEnabled}
          onToggle={toggleWifi}
        />
        <QuickTile
          icon={<Plane size={18} />}
          label="Airplane mode"
          pressed={airplaneMode}
          onToggle={toggleAirplaneMode}
        />
        <QuickTile icon={<Leaf size={18} />} label="Battery saver" pressed={batterySaver} onToggle={toggleBatterySaver} />
        <QuickTile icon={<MoonStar size={18} />} label="Night light" pressed={nightLight} onToggle={toggleNightLight} />
        <QuickTile
          icon={<Accessibility size={18} />}
          label="Reduce motion"
          pressed={reduceMotion}
          onToggle={() => setReduceMotion(!reduceMotion)}
        />
      </div>

      <div className="w11-quick__sliders">
        <div className="w11-quick__slider-row">
          <span className="w11-quick__slider-icon" aria-hidden="true">
            <Sun size={18} />
          </span>
          <RangeSlider label="Brightness" value={brightness} valueText={`${brightness}%`} onChange={setBrightness} />
          <output className="w11-quick__slider-value" aria-hidden="true">
            {brightness}
          </output>
        </div>

        <div className="w11-quick__slider-row">
          <button
            type="button"
            className="w11-quick__slider-button"
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
            title={readings.volume.tooltip}
            onClick={toggleMuted}
          >
            <VolumeIcon glyph={readings.volume.glyph} size={18} />
          </button>
          <RangeSlider
            label="Volume"
            value={volume}
            valueText={muted ? "Muted" : `${volume}%`}
            onChange={setVolume}
          />
          <button
            type="button"
            className="w11-quick__slider-button"
            aria-label="Sound settings"
            title="Sound settings"
            onClick={() => onOpenSettings("sound")}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="w11-quick__footer">
        {battery ? (
          <span className="w11-quick__battery" title={battery.tooltip}>
            <BatteryIcon glyph={battery.glyph} size={18} />
            <span>
              {battery.percent}%
              <small>{battery.text}</small>
            </span>
          </span>
        ) : null}
        <button
          type="button"
          className="w11-quick__slider-button"
          aria-label="All settings"
          title="All settings"
          onClick={() => onOpenSettings("system")}
        >
          <SettingsIcon size={18} aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}
