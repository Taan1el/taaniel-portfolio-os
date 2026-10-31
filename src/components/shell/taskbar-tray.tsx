import { useEffect, useRef, type MouseEvent } from "react";
import {
  Clock,
  Leaf,
  MoonStar,
  Plane,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  WifiOff,
  Wifi,
  Zap,
} from "lucide-react";
import { BatteryIcon, NetworkGlyph, VolumeIcon } from "@/components/shell/tray-glyphs";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { useSecondClock } from "@/hooks/use-second-clock";
import { formatShortDate, formatTime, useClockPrefs } from "@/lib/clock-format";
import { useTrayReadings } from "@/hooks/use-tray-readings";
import type { SettingsSectionId } from "@/lib/settings-sections";
import { consumeWheel } from "@/lib/tray-wheel";
import { cn } from "@/lib/utils";
import { useDeviceStore } from "@/stores/device-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemSettingsStore, VOLUME_WHEEL_STEP } from "@/stores/system-settings-store";
import type { AppId, ContextMenuAction, WindowPayload } from "@/types/system";

/** Tray date the way Windows prints it: numeric, in the visitor's locale (6.10.2026, 10/6/2026, ...). */
export function formatTrayDate(date: Date) {
  return formatShortDate(date);
}

interface TrayClockProps {
  now: Date;
  open: boolean;
  onToggle: () => void;
  onContextMenu: (event: MouseEvent) => void;
}

/** The clock button. The seconds setting decides how often it draws; the minute clock is far cheaper. */
function TrayClock({ now, open, onToggle, onContextMenu }: TrayClockProps) {
  const prefs = useClockPrefs();
  const time = formatTime(now, prefs, { seconds: prefs.clockSeconds });
  const date = formatShortDate(now, prefs);

  return (
    <button
      className={cn("w11-taskbar__tray-button w11-taskbar__clock", open && "is-active")}
      type="button"
      aria-label={`${time}, ${date} - open calendar`}
      aria-haspopup="dialog"
      aria-expanded={open}
      data-flyout-trigger="clock"
      onClick={onToggle}
      onContextMenu={onContextMenu}
    >
      <span>{time}</span>
      <span>{date}</span>
    </button>
  );
}

function MinuteTrayClock(props: Omit<TrayClockProps, "now">) {
  return <TrayClock now={useMinuteClock()} {...props} />;
}

function SecondTrayClock(props: Omit<TrayClockProps, "now">) {
  return <TrayClock now={useSecondClock()} {...props} />;
}

interface TaskbarTrayProps {
  calendarOpen: boolean;
  onToggleCalendar: () => void;
  onShowDesktop: () => void;
  onLaunchApp: (appId: AppId, payload?: WindowPayload) => void;
}

/**
 * The right end of the taskbar: live network, speaker and battery glyphs that
 * open Quick Settings, the clock that opens the calendar, and the show-desktop
 * sliver. Each glyph has its own hover text, as in Windows.
 */
export function TaskbarTray({ calendarOpen, onToggleCalendar, onShowDesktop, onLaunchApp }: TaskbarTrayProps) {
  const readings = useTrayReadings();
  const clockSeconds = useSystemSettingsStore((state) => state.clockSeconds);
  const quickSettingsOpen = useShellStore((state) => state.quickSettingsOpen);
  const toggleQuickSettings = useShellStore((state) => state.toggleQuickSettings);
  const setContextMenu = useShellStore((state) => state.setContextMenu);
  const volumeGlyphRef = useRef<HTMLSpanElement | null>(null);
  const wheelRemainder = useRef(0);

  // Scrolling over the speaker nudges the volume, 2% a notch. A native listener,
  // because React's wheel handlers are passive and cannot stop the page scrolling.
  useEffect(() => {
    const glyph = volumeGlyphRef.current;

    if (!glyph) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { steps, remainder } = consumeWheel(wheelRemainder.current, event.deltaY, event.deltaMode);
      wheelRemainder.current = remainder;

      if (steps !== 0) {
        useSystemSettingsStore.getState().changeVolume(steps * VOLUME_WHEEL_STEP);
      }
    };

    glyph.addEventListener("wheel", handleWheel, { passive: false });
    return () => glyph.removeEventListener("wheel", handleWheel);
  }, []);

  const openSettings = (section: SettingsSectionId) => onLaunchApp("settings", { section });

  const showMenu = (event: MouseEvent, title: string, actions: ContextMenuAction[]) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, title, actions });
  };

  const networkMenu = (event: MouseEvent) => {
    const { wifiEnabled, airplaneMode } = useDeviceStore.getState();

    showMenu(event, "Network", [
      {
        id: "network-settings",
        label: "Network & internet settings",
        icon: Wifi,
        onSelect: () => openSettings("network"),
      },
      airplaneMode
        ? {
            id: "airplane-off",
            label: "Turn off airplane mode",
            icon: Plane,
            onSelect: () => useDeviceStore.getState().setAirplaneMode(false),
          }
        : {
            id: "wifi-toggle",
            label: wifiEnabled ? "Turn Wi-Fi off" : "Turn Wi-Fi on",
            icon: wifiEnabled ? WifiOff : Wifi,
            onSelect: () => useDeviceStore.getState().toggleWifi(),
          },
    ]);
  };

  const volumeMenu = (event: MouseEvent) => {
    const muted = useSystemSettingsStore.getState().muted;

    showMenu(event, "Speakers", [
      { id: "sound-settings", label: "Sound settings", icon: Volume2, onSelect: () => openSettings("sound") },
      {
        id: "mute-toggle",
        label: muted ? "Unmute" : "Mute",
        icon: muted ? Volume2 : VolumeX,
        onSelect: () => useSystemSettingsStore.getState().toggleMuted(),
      },
    ]);
  };

  const batteryMenu = (event: MouseEvent) => {
    const batterySaver = useSystemSettingsStore.getState().batterySaver;

    showMenu(event, "Battery", [
      { id: "power-settings", label: "Power & battery settings", icon: Zap, onSelect: () => openSettings("power") },
      {
        id: "saver-toggle",
        label: batterySaver ? "Turn battery saver off" : "Turn battery saver on",
        icon: Leaf,
        onSelect: () => useSystemSettingsStore.getState().toggleBatterySaver(),
      },
    ]);
  };

  const clockMenu = (event: MouseEvent) =>
    showMenu(event, "Clock", [
      { id: "time-settings", label: "Adjust date and time", icon: Clock, onSelect: () => openSettings("time") },
      { id: "all-settings", label: "Settings", icon: SettingsIcon, onSelect: () => openSettings("system") },
    ]);

  const { network, volume, battery } = readings;

  return (
    <div className="w11-taskbar__tray">
      <button
        className={cn("w11-taskbar__tray-button w11-taskbar__quick", quickSettingsOpen && "is-active")}
        type="button"
        aria-label={readings.summary}
        aria-haspopup="dialog"
        aria-expanded={quickSettingsOpen}
        data-flyout-trigger="quick-settings"
        onClick={toggleQuickSettings}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span
          className="w11-tray-glyph"
          data-tray-glyph="network"
          data-warning={network.status === "no-internet" ? "true" : undefined}
          title={network.tooltip}
          onContextMenu={networkMenu}
        >
          <NetworkGlyph status={network.status} strength={network.strength} />
        </span>
        <span
          ref={volumeGlyphRef}
          className="w11-tray-glyph"
          data-tray-glyph="volume"
          title={volume.tooltip}
          onContextMenu={volumeMenu}
          onAuxClick={(event) => {
            // Middle-click mutes, like the speaker icon in Windows.
            if (event.button === 1) {
              event.preventDefault();
              useSystemSettingsStore.getState().toggleMuted();
            }
          }}
        >
          <VolumeIcon glyph={volume.glyph} />
        </span>
        {battery ? (
          <span
            className="w11-tray-glyph"
            data-tray-glyph="battery"
            title={battery.tooltip}
            onContextMenu={batteryMenu}
          >
            <BatteryIcon glyph={battery.glyph} />
          </span>
        ) : readings.batterySaver ? (
          <span
            className="w11-tray-glyph"
            data-tray-glyph="battery-saver"
            title="Battery saver"
            onContextMenu={batteryMenu}
          >
            <Leaf size={16} aria-hidden="true" />
          </span>
        ) : null}
        {readings.nightLight ? (
          <span className="w11-tray-glyph" data-tray-glyph="night-light" title="Night light">
            <MoonStar size={16} aria-hidden="true" />
          </span>
        ) : null}
      </button>

      {clockSeconds ? (
        <SecondTrayClock open={calendarOpen} onToggle={onToggleCalendar} onContextMenu={clockMenu} />
      ) : (
        <MinuteTrayClock open={calendarOpen} onToggle={onToggleCalendar} onContextMenu={clockMenu} />
      )}

      <button
        className="w11-taskbar__show-desktop"
        type="button"
        aria-label="Show desktop"
        title="Show desktop"
        onClick={onShowDesktop}
      />
    </div>
  );
}
