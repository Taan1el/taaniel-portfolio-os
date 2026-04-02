import { GamePortNoticeApp } from "@/components/apps/game-port-notice-app";
import type { AppComponentProps } from "@/types/system";

export function HextrisApp(props: AppComponentProps) {
  return (
    <GamePortNoticeApp
      {...props}
      title="Hextris"
      subtitle="Puzzle port paused for security hardening"
      description="The previous port depended on serialized function revival and inline event wiring. It has been removed until a safer puzzle replacement is ready for the desktop shell."
      fallbackAppIds={["games", "snake", "tetris"]}
    />
  );
}
