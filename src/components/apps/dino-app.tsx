import { EmbeddedGameApp } from "@/components/apps/embedded-game-app";
import { embeddedGameCatalog } from "@/lib/games";
import type { AppComponentProps } from "@/types/system";

export function DinoApp(props: AppComponentProps) {
  return <EmbeddedGameApp {...props} {...embeddedGameCatalog.dino} />;
}
