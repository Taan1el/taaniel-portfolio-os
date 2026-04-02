import { GamePortNoticeApp } from "@/components/apps/game-port-notice-app";
import type { AppComponentProps } from "@/types/system";

export function DinoApp(props: AppComponentProps) {
  return (
    <GamePortNoticeApp
      {...props}
      title="Dino"
      subtitle="Runner port paused for security hardening"
      description="The previous Dino bundle depended on inline scripts and dynamic style injection, so it has been removed from the portfolio OS until a safer local rebuild is ready."
      fallbackAppIds={["snake", "tetris"]}
    />
  );
}
