import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { buildTrayReadings, type TrayReadings } from "@/lib/tray-readings";
import { selectNetworkStatus, useDeviceStore } from "@/stores/device-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

/** What the tray, Quick Settings and the Settings pages show: device readings plus the visitor's switches. */
export function useTrayReadings(): TrayReadings {
  const networkStatus = useDeviceStore(selectNetworkStatus);
  const effectiveType = useDeviceStore((state) => state.effectiveType);
  const battery = useDeviceStore((state) => state.battery);
  const { volume, muted, batterySaver, nightLight } = useSystemSettingsStore(
    useShallow((state) => ({
      volume: state.volume,
      muted: state.muted,
      batterySaver: state.batterySaver,
      nightLight: state.nightLight,
    }))
  );

  return useMemo(
    () => buildTrayReadings({ networkStatus, effectiveType, volume, muted, battery, batterySaver, nightLight }),
    [battery, batterySaver, effectiveType, muted, networkStatus, nightLight, volume]
  );
}
