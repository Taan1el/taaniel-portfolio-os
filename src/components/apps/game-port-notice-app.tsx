import { ShieldAlert } from "lucide-react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button, EmptyState } from "@/components/apps/app-layout";
import { getAppDefinition } from "@/lib/app-registry";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps, AppId } from "@/types/system";

interface GamePortNoticeAppProps extends AppComponentProps {
  title: string;
  subtitle: string;
  description: string;
  fallbackAppIds?: readonly AppId[];
}

export function GamePortNoticeApp({
  window: appWindow,
  title,
  subtitle,
  description,
  fallbackAppIds = [],
}: GamePortNoticeAppProps) {
  void appWindow;

  const launchApp = useSystemStore((state) => state.launchApp);

  return (
    <ArcadeGameShell
      className="game-port-notice"
      title={title}
      subtitle={subtitle}
      actions={<span className="games-hub__chip">Security review</span>}
      footer={
        <>
          <span>This port is paused while a safer local version is prepared.</span>
          <small>No user input is evaluated or executed as code in this fallback.</small>
        </>
      }
    >
      <div className="arcade-game-shell__interactive game-port-notice__content">
        <EmptyState
          title={`${title} is temporarily unavailable`}
          description={description}
          actions={
            fallbackAppIds.length ? (
              <>
                {fallbackAppIds.map((appId) => {
                  const app = getAppDefinition(appId);

                  return (
                    <Button
                      key={appId}
                      type="button"
                      variant="panel"
                      onClick={() => launchApp({ appId })}
                    >
                      <ShieldAlert size={15} />
                      Open {app.title}
                    </Button>
                  );
                })}
              </>
            ) : undefined
          }
        >
          <ShieldAlert size={22} />
        </EmptyState>
      </div>
    </ArcadeGameShell>
  );
}
