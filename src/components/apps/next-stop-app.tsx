import { useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCcw } from "lucide-react";
import { ArcadeGameShell } from "@/components/apps/arcade-game-shell";
import { Button } from "@/components/apps/app-layout";
import { resolvePublicAssetUrl } from "@/lib/assets";
import { getMasterGain } from "@/lib/master-volume";
import { connectNextStop, type NextStopRuntime } from "@/lib/next-stop";
import { getSystemSettings, useSystemSettingsStore } from "@/stores/system-settings-store";
import { useWindowStore } from "@/stores/window-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

const gameUrl = resolvePublicAssetUrl("assets/games/next-stop/next-stop.html");
// Minimized windows unmount in this shell. Keep their exact journey until restored.
const minimizedJourneys = new Map<string, unknown>();
useWindowStore.subscribe((state) => {
  for (const id of minimizedJourneys.keys()) {
    if (!state.windows.some((entry) => entry.id === id)) minimizedJourneys.delete(id);
  }
});

export function NextStopApp({ window: appWindow }: AppComponentProps) {
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<ReturnType<typeof connectNextStop> | null>(null);
  const gameRef = useRef<NextStopRuntime | null>(null);
  const frameCleanupRef = useRef<(() => void) | null>(null);
  const [reload, setReload] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [slow, setSlow] = useState(false);
  const activeRef = useRef(false);
  activeRef.current = activeWindowId === appWindow.id && !appWindow.minimized;

  const syncActive = () => bridgeRef.current?.setActive(activeRef.current && !document.hidden);
  const release = (remember: boolean) => {
    const game = gameRef.current;
    if (remember && game?.started && !game.destroyed) minimizedJourneys.set(appWindow.id, game.serialize());
    // StrictMode also cleans up before the first iframe load. That empty pass
    // must not erase a journey waiting to be restored.
    else if (game) minimizedJourneys.delete(appWindow.id);
    frameCleanupRef.current?.();
    frameCleanupRef.current = null;
    if (bridgeRef.current) bridgeRef.current.dispose();
    else game?.destroy();
    bridgeRef.current = null;
    gameRef.current = null;
  };

  useEffect(() => {
    const unsubscribe = useSystemSettingsStore.subscribe(() => bridgeRef.current?.syncAudio());
    const visibility = () => syncActive();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", visibility);
      const minimized = useWindowStore.getState().windows.some((entry) => entry.id === appWindow.id && entry.minimized);
      release(minimized);
    };
  }, [appWindow.id]);

  useEffect(syncActive, [activeWindowId, appWindow.minimized, status]);

  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => setSlow(true), 15000);
    return () => window.clearTimeout(timer);
  }, [status, reload]);

  const loaded = () => {
    try {
      const frame = frameRef.current?.contentWindow as (Window & { nextStopGame?: NextStopRuntime }) | null;
      const game = frame?.nextStopGame;
      if (!frame || !game) throw new Error("The local game could not start.");
      gameRef.current = game;
      const focus = () => {
        useSystemStore.getState().focusWindow(appWindow.id);
        // A restored frame has no audio context yet. Unlock it on this gesture,
        // including the player's click on Resume after minimizing.
        if (game.started) game.ensureAudio?.();
      };
      frame.document.addEventListener("pointerdown", focus, true);
      frameCleanupRef.current = () => frame.document.removeEventListener("pointerdown", focus, true);
      const saved = minimizedJourneys.get(appWindow.id);
      if (saved) {
        game.restore(saved);
        game.started = true;
        game.openMenu("pause");
        minimizedJourneys.delete(appWindow.id);
      }
      bridgeRef.current = connectNextStop(game, frame, () => {
        const settings = getSystemSettings();
        return getMasterGain(settings.volume, settings.muted);
      });
      syncActive();
      setStatus("ready");
    } catch {
      release(false);
      setStatus("error");
    }
  };

  return (
    <ArcadeGameShell
      className="next-stop-app"
      contentClassName="embedded-game__content"
      title="Next Stop"
      subtitle="A rural railway made of coloured letters · by Taaniel"
      actions={<>
        <a className="button button--panel button--compact" href={gameUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} />Open full page</a>
        <Button variant="panel" onClick={() => { release(true); setSlow(false); setStatus("loading"); setReload((value) => value + 1); }}><RefreshCcw size={15} />Reload</Button>
      </>}
      footer={<span>WASD: walk / power · E: board · Space: brake · J: journal · Esc: pause. Progress saves on pause; maximize for a wider view.</span>}
    >
      <div className={`embedded-game__viewport ${status === "ready" ? "is-loaded" : ""}`}>
        {status === "loading" && <div className="embedded-game__loading" role="status"><strong>Preparing the valley…</strong><p>{slow ? "First launch can take up to a minute while the browser prepares the glyph renderer." : "Loading the local railway. No server or account needed."}</p></div>}
        {status === "error" && <div className="embedded-game__error" role="alert"><strong>The railway could not start</strong><p>Next Stop needs WebGL2. Try Reload or Open full page.</p></div>}
        <iframe key={reload} ref={frameRef} className="embedded-game__frame" src={gameUrl} title="Next Stop game" allow="autoplay; fullscreen" allowFullScreen sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-downloads" onLoad={loaded} />
      </div>
    </ArcadeGameShell>
  );
}
