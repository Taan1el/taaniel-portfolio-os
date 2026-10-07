import type { ReactNode } from "react";
import type { AppIcon } from "@/types/system";

/**
 * Props every icon in the shell accepts. Mirrors `AppIcon` in @/types/system.
 *
 * `strokeWidth` is accepted and ignored: bespoke icons are built from filled
 * paths, not strokes. It stays in the signature so a bespoke icon is a drop-in
 * replacement for a lucide glyph at the call sites that still pass it.
 */
export interface AppIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Which artwork variant to draw.
 *
 * `full`  - the complete icon: interior detail, multiple fills, highlights.
 * `micro` - a simplified silhouette: fewer paths, thicker forms, no detail
 *           that would render below roughly 2 device pixels wide.
 */
export type IconDetail = "full" | "micro";

export interface AppIconArtwork {
  full: ReactNode;
  /** Omit when the full artwork already reads cleanly at 16px. */
  micro?: ReactNode;
}

/**
 * Every size the shell currently renders an app icon at.
 *
 *   13  window title bar          (window-frame.tsx:171)
 *   14  taskbar buttons, jump list (taskbar.tsx:313, :415, :456)
 *   16  shell search results      (shell-search-results.tsx:29)
 *   18  start menu, open-with     (start-app-list.tsx:83, open-with-dialog.tsx:43)
 *   20  games hub card            (games-app.tsx:99)
 *   24  taskbar pinned button     (taskbar.tsx:271)
 *   48  desktop icon              (desktop-icon.tsx:84, currently 28)
 *
 * Artwork is authored on a 48x48 grid and scaled down, so the small end is
 * where detail is lost. Windows 11 itself renders taskbar icons at 24px and
 * desktop icons at 48px; 13px and 14px here are below anything real Windows
 * does and are slated to grow during the taskbar and window-chrome rewrites.
 */
export const ICON_RENDER_SIZES = [13, 14, 16, 18, 20, 24, 32, 48] as const;

/**
 * Pick which artwork variant to draw at a given rendered size.
 *
 * Callers pass a pixel size; this returns "full" or "micro". `createAppIcon`
 * falls back to `full` whenever an icon ships no `micro` artwork, so this only
 * needs to express the intent, not guard against missing variants.
 */
export const MICRO_DETAIL_BELOW = 24;

export function resolveIconDetail(size: number): IconDetail {
  return size < MICRO_DETAIL_BELOW ? "micro" : "full";
}

/**
 * Build a shell icon component from artwork authored on a 48x48 grid.
 *
 * The returned component satisfies `AppIcon`, so it drops straight into
 * `AppDefinition.icon`, `ExplorerSidebarLocation.icon` and `ContextMenuAction.icon`
 * with no call-site changes.
 */
export function createAppIcon(displayName: string, artwork: AppIconArtwork): AppIcon {
  function Icon({ size = 24, className }: AppIconProps) {
    const detail = resolveIconDetail(size);
    const art = detail === "micro" && artwork.micro ? artwork.micro : artwork.full;

    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        role="presentation"
        focusable="false"
        aria-hidden="true"
        shapeRendering="geometricPrecision"
      >
        {art}
      </svg>
    );
  }

  Icon.displayName = displayName;
  return Icon;
}
