import { GamePortNoticeApp } from "@/components/apps/game-port-notice-app";
import type { AppComponentProps } from "@/types/system";

export function DoomApp(props: AppComponentProps) {
  return (
    <GamePortNoticeApp
      {...props}
      title="Doom"
      subtitle="Experimental port paused for security hardening"
      description="The bundled DOS runtime relied on generated functions and inline boot scripts. It has been removed so the shell no longer ships executable third-party code paths that bypass the OS runtime."
      fallbackAppIds={["games", "snake", "tetris"]}
    />
  );
}
