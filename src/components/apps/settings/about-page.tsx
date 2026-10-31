import { useEffect, useMemo, useState } from "react";
import { ClipboardCopy, Cpu, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import { SettingsGroup, SettingsRow } from "@/components/apps/settings/settings-controls";
import { LogoMark } from "@/components/ui/logo-mark";
import { describeDevice, describeUptime, readGpuRenderer } from "@/lib/device-details";
import { OS_NAME, OS_VERSION } from "@/lib/os-info";
import { confirmInOs } from "@/stores/confirm-dialog-store";
import { useSystemStore } from "@/stores/system-store";
import { toast } from "@/stores/toast-store";

/** Read-only facts about this browser and device, and a way to copy them. Nothing here is invented. */
export function AboutPage() {
  const resetLayout = useSystemStore((state) => state.resetLayout);
  const [uptime, setUptime] = useState(() => describeUptime(performance.now()));
  const details = useMemo(
    () =>
      describeDevice({
        navigator,
        screen: window.screen,
        devicePixelRatio: window.devicePixelRatio,
        gpu: readGpuRenderer(document),
      }),
    []
  );

  useEffect(() => {
    const timer = window.setInterval(() => setUptime(describeUptime(performance.now())), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const copyDetails = async () => {
    const text = [`${OS_NAME} ${OS_VERSION}`, ...details.map((entry) => `${entry.label}: ${entry.value}`)].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast("Device details copied", "success");
    } catch {
      toast("The browser would not let Taaniel OS use the clipboard", "error");
    }
  };

  const resetDesktop = async () => {
    const confirmed = await confirmInOs({
      title: "Reset desktop",
      message:
        "This closes every window and puts the theme, wallpaper, pinned apps and desktop icon positions back to the defaults. Your files and the settings on these pages are kept.",
      confirmLabel: "Reset",
    });

    if (confirmed) resetLayout();
  };

  return (
    <>
      <SettingsGroup title="Taaniel OS">
        <SettingsRow icon={<LogoMark size={22} />} title={OS_NAME} description={`Version ${OS_VERSION}. Runs entirely in this browser tab.`} />
        <SettingsRow icon={<Timer size={18} />} title="Up time" description="Since this page was loaded.">
          <span className="w11-settings__figure">{uptime}</span>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Device specifications">
        <SettingsRow
          icon={<Cpu size={18} />}
          settingId="device-specs"
          title="What this browser reports"
          description="Browsers round or hide some of these on purpose."
        />
        {details.map((entry) => (
          <SettingsRow key={entry.label} className="is-nested" title={entry.label} description={entry.value} />
        ))}
        <SettingsRow icon={<ClipboardCopy size={18} />} settingId="copy-details" title="Copy device details">
          <Button type="button" variant="panel" onClick={copyDetails}>
            Copy
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Recovery">
        <SettingsRow
          icon={<RotateCcw size={18} />}
          settingId="reset-desktop"
          title="Reset desktop"
          description="Closes all windows and restores the default theme, wallpaper, pinned apps and icon layout. Files and settings stay."
        >
          <Button type="button" variant="panel" onClick={resetDesktop}>
            Reset
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
