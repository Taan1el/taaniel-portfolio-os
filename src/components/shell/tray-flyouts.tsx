import { useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { QuickSettingsFlyout } from "@/components/shell/quick-settings/quick-settings-flyout";
import type { SettingsSectionId } from "@/lib/settings-sections";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";

/**
 * Mounts the flyouts that rise from the tray. Each reads its open state from
 * the shell store, so the desktop only has to render this one element.
 */
export function TrayFlyouts() {
  const quickSettingsOpen = useShellStore((state) => state.quickSettingsOpen);
  const launchApp = useSystemStore((state) => state.launchApp);

  // Launching an app closes every shell overlay, so the flyout dismisses itself.
  const openSettings = useCallback(
    (section: SettingsSectionId) => {
      launchApp({ appId: "settings", payload: { section } });
    },
    [launchApp]
  );

  return (
    <AnimatePresence>
      {quickSettingsOpen ? <QuickSettingsFlyout key="quick-settings" onOpenSettings={openSettings} /> : null}
    </AnimatePresence>
  );
}
