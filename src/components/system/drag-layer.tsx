import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Ban, ExternalLink, Link2, Plus } from "lucide-react";
import { RecycleBinEmptyIcon } from "@/components/icons/apps";
import { NodeIcon } from "@/components/icons/node-icon";
import { TransferDialog } from "@/components/system/transfer-dialog";
import { DESKTOP_PATH, getDesktopNodeId } from "@/data/desktop-seed";
import { configureDragEnvironment } from "@/lib/dnd/controller";
import { placeArrivalsOnDesktop } from "@/lib/dnd/desktop-placement";
import { useDragStore, type DragSession } from "@/lib/dnd/drag-store";
import type { DragOperation } from "@/lib/dnd/types";
import { normalizePath } from "@/lib/filesystem";
import { resolveShortcutNode } from "@/lib/shortcuts";
import { useExplorerStore } from "@/stores/explorer-store";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppId, ContextMenuAction } from "@/types/system";

/** How many dragged icons are drawn in the stack under the pointer. */
const GHOST_STACK = 3;

async function transferAndPlace(
  paths: string[],
  destination: string,
  operation: DragOperation,
  point: { x: number; y: number }
) {
  const result = await useFileSystemStore.getState().transferNodes(paths, destination, operation);

  if (normalizePath(destination) === DESKTOP_PATH && result.transferred.length > 0) {
    const landed = result.transferred.map((entry) => entry.to);

    // Dropped icons appear where the pointer let go, selected, like Explorer's drop on the desktop.
    placeArrivalsOnDesktop(landed, point);
    useShellStore.getState().setSelectedIconIds(landed.map(getDesktopNodeId));
  }

  return result;
}

/** Open a dropped file with a given app, in the window it was dropped on when there is one. */
function openDroppedFile(request: { appId: AppId; windowId?: string; paths: string[] }) {
  const { launchApp, openFileInWindow } = useSystemStore.getState();
  const nodes = useFileSystemStore.getState().nodes;
  const saved = nodes[normalizePath(request.paths[0])];
  const target = saved?.kind === "file" && saved.shortcut ? resolveShortcutNode(nodes, saved) : saved;

  if (!target || target.kind !== "file") {
    return;
  }

  if (request.windowId) {
    openFileInWindow(request.windowId, target.path);
    return;
  }

  launchApp({ appId: request.appId, payload: { filePath: target.path } });
}

function buildDropMenu(destination: string, paths: string[], point: { x: number; y: number }): ContextMenuAction[] {
  const run = (operation: DragOperation) => () => void transferAndPlace(paths, destination, operation, point);

  return [
    { id: "move-here", label: "Move here", icon: ArrowRight, onSelect: run("move") },
    { id: "copy-here", label: "Copy here", icon: Plus, onSelect: run("copy") },
    { id: "link-here", label: "Create shortcuts here", icon: Link2, onSelect: run("link") },
    { id: "sep-cancel", label: "", separator: true, onSelect: () => {} },
    { id: "cancel-drop", label: "Cancel", onSelect: () => {} },
  ];
}

/** Over a place that turns the drop down (as opposed to open space, or the folder the items are already in). */
function isRefused(session: DragSession) {
  return session.plan.kind === "none" && !session.plan.quiet && session.overZone;
}

function OperationGlyph({ session }: { session: DragSession }) {
  const { plan } = session;

  if (plan.kind === "none") {
    return isRefused(session) ? <Ban size={14} aria-hidden="true" /> : null;
  }

  if (plan.kind === "open-with") return <ExternalLink size={14} aria-hidden="true" />;
  if (plan.kind === "transfer" && plan.operation === "copy") return <Plus size={14} aria-hidden="true" />;
  if (plan.kind === "transfer" && plan.operation === "link") return <Link2 size={14} aria-hidden="true" />;
  return <ArrowRight size={14} aria-hidden="true" />;
}

function describeSession(session: DragSession) {
  if (session.hover === "restore-window") return "Opening window…";
  if (session.hover === "open-folder") return "Opening folder…";

  switch (session.plan.kind) {
    case "transfer":
    case "open-with":
    case "choose":
      return session.plan.label;
    default:
      return isRefused(session) ? "You can't drop these items here" : "";
  }
}

/** The pointer shape for a drag: the arrow, plus-arrow for copy, link-arrow for a shortcut, a barred circle when refused. */
function getDragEffect(session: DragSession | null) {
  if (!session) return undefined;

  const { plan } = session;

  if (plan.kind === "none") return isRefused(session) ? "blocked" : undefined;
  if (plan.kind === "transfer" && plan.operation === "copy") return "copy";
  if (plan.kind === "transfer" && plan.operation === "link") return "link";
  return undefined;
}

/** What follows the pointer while files are dragged: the icons, a count, and what releasing would do. */
function DragGhost({ session }: { session: DragSession }) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const label = describeSession(session);
  const shown = session.items.slice(0, GHOST_STACK);

  return createPortal(
    <div
      className="drag-ghost"
      data-dnd-ignore="true"
      data-pointer={session.pointerType}
      data-blocked={isRefused(session) ? "true" : undefined}
      style={{ transform: `translate3d(${session.x}px, ${session.y}px, 0)` }}
    >
      <div className="drag-ghost__stack" aria-hidden="true">
        {shown.map((item, index) => {
          const node = item.path ? nodes[item.path] : undefined;

          return (
            <span
              key={item.id}
              className="drag-ghost__icon"
              // The grabbed item sits on top; the rest peek out behind it.
              style={{ "--ghost-index": index, zIndex: shown.length - index } as React.CSSProperties}
            >
              {node ? <NodeIcon node={node} size={40} /> : <RecycleBinEmptyIcon size={40} />}
            </span>
          );
        })}
        {session.items.length > 1 ? <span className="drag-ghost__count">{session.items.length}</span> : null}
      </div>
      {label ? (
        <div className="drag-ghost__chip" aria-hidden="true">
          <OperationGlyph session={session} />
          <span>{label}</span>
        </div>
      ) : null}
      <span className="drag-ghost__live" role="status" aria-live="polite">
        {label}
      </span>
    </div>,
    document.body
  );
}

/**
 * Wires the drag controller into the shell (what a drop does) and draws the
 * drag ghost. Mounted once, next to the window host.
 */
export function DragLayer() {
  const session = useDragStore((state) => state.session);
  const effect = getDragEffect(session);

  useEffect(() => {
    if (effect) {
      document.body.dataset.dragEffect = effect;
    }

    return () => {
      delete document.body.dataset.dragEffect;
    };
  }, [effect]);

  useEffect(
    () =>
      configureDragEnvironment({
        getNodes: () => useFileSystemStore.getState().nodes,
        explorerPathOf: (windowId) => useExplorerStore.getState().sessions[windowId]?.currentPath,
        transfer: transferAndPlace,
        openWith: openDroppedFile,
        springOpen: (windowId, path) => useExplorerStore.getState().navigate(windowId, path),
        activateWindow: (windowId) => useSystemStore.getState().focusWindow(windowId),
        chooseOperation: ({ x, y, destination, paths }) =>
          useShellStore.getState().setContextMenu({ x, y, title: "Drop", actions: buildDropMenu(destination, paths, { x, y }) }),
      }),
    []
  );

  return (
    <>
      {session ? <DragGhost session={session} /> : null}
      <TransferDialog />
    </>
  );
}
