import { Plane, Wifi } from "lucide-react";
import { SettingsGroup, SettingsRow, ToggleSwitch } from "@/components/apps/settings/settings-controls";
import { NetworkGlyph } from "@/components/shell/tray-glyphs";
import { useTrayReadings } from "@/hooks/use-tray-readings";
import { describeNetwork } from "@/lib/device-status";
import { useDeviceStore } from "@/stores/device-store";

export function NetworkPage() {
  const { network } = useTrayReadings();
  const wifiEnabled = useDeviceStore((state) => state.wifiEnabled);
  const airplaneMode = useDeviceStore((state) => state.airplaneMode);
  const effectiveType = useDeviceStore((state) => state.effectiveType);
  const setWifiEnabled = useDeviceStore((state) => state.setWifiEnabled);
  const setAirplaneMode = useDeviceStore((state) => state.setAirplaneMode);
  const description = describeNetwork(network.status);

  return (
    <>
      <SettingsGroup title="Status">
        <SettingsRow
          icon={<NetworkGlyph status={network.status} strength={network.strength} size={18} />}
          title={description.title}
          description={description.detail}
        />
        {effectiveType && network.status === "connected" ? (
          <SettingsRow title="Connection type" description={`${effectiveType.toUpperCase()}, as estimated by your browser`} />
        ) : null}
      </SettingsGroup>

      <SettingsGroup title="Wireless">
        <SettingsRow icon={<Wifi size={18} />} settingId="wifi" title="Wi-Fi" description="Connect to the internet.">
          <ToggleSwitch label="Wi-Fi" checked={wifiEnabled} onChange={setWifiEnabled} />
        </SettingsRow>
        <SettingsRow
          icon={<Plane size={18} />}
          settingId="airplane-mode"
          title="Airplane mode"
          description="Turns Wi-Fi off. You can switch Wi-Fi back on while airplane mode stays on."
        >
          <ToggleSwitch label="Airplane mode" checked={airplaneMode} onChange={setAirplaneMode} />
        </SettingsRow>
      </SettingsGroup>

      <p className="w11-settings__note">
        While offline, the Browser shows an offline page for web addresses and AI-assisted search stays off. Files on
        this device keep working. Wi-Fi and airplane mode reset when you reload the page.
      </p>
    </>
  );
}
