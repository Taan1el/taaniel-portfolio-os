import { EmbeddedGameApp } from "@/components/apps/embedded-game-app";
import { embeddedGameCatalog } from "@/lib/games";
import type { AppComponentProps } from "@/types/system";

export function HextrisApp(props: AppComponentProps) {
  return <EmbeddedGameApp {...props} {...embeddedGameCatalog.hextris} />;
}

