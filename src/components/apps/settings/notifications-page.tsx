import { Bell, BellOff, BellPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import { SettingsGroup, SettingsRow, ToggleSwitch } from "@/components/apps/settings/settings-controls";
import { useSystemSettingsStore } from "@/stores/system-settings-store";
import { toast, useToastStore } from "@/stores/toast-store";

const timeFormat = new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Do not disturb holds toasts back; the history keeps every one raised since this tab opened. */
export function NotificationsPage() {
  const doNotDisturb = useSystemSettingsStore((state) => state.doNotDisturb);
  const setDoNotDisturb = useSystemSettingsStore((state) => state.setDoNotDisturb);
  const history = useToastStore((state) => state.history);
  const clearHistory = useToastStore((state) => state.clearHistory);

  return (
    <>
      <SettingsGroup title="Notifications">
        <SettingsRow
          icon={doNotDisturb ? <BellOff size={18} /> : <Bell size={18} />}
          settingId="do-not-disturb"
          title="Do not disturb"
          description="Hold back pop-up notifications. They still collect in the history below."
        >
          <ToggleSwitch label="Do not disturb" checked={doNotDisturb} onChange={setDoNotDisturb} />
        </SettingsRow>
        <SettingsRow
          icon={<BellPlus size={18} />}
          settingId="test-notification"
          title="Send a test notification"
          description={doNotDisturb ? "Do not disturb is on, so it will only land in the history." : "Shows a pop-up in the corner."}
        >
          <Button type="button" variant="panel" onClick={() => toast("This is a test notification.", "info")}>
            Send
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="History">
        <SettingsRow
          icon={<Trash2 size={18} />}
          settingId="notification-history"
          title="Notification history"
          description={
            history.length === 0
              ? "Nothing yet. This list is kept until you close or reload the tab."
              : `${history.length} notification${history.length === 1 ? "" : "s"} this session`
          }
        >
          <Button type="button" variant="panel" disabled={history.length === 0} onClick={clearHistory}>
            Clear history
          </Button>
        </SettingsRow>
        {history.map((record) => (
          <SettingsRow
            key={record.id}
            className="is-nested"
            title={record.message}
            description={`${timeFormat.format(record.at)}, ${record.type}${record.muted ? ", held back by do not disturb" : ""}`}
          />
        ))}
      </SettingsGroup>
    </>
  );
}
