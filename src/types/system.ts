import type { ComponentType } from "react";
import type { SettingsSectionId } from "@/lib/settings-sections";

/**
 * The contract every icon in the shell satisfies.
 *
 * Deliberately narrower than lucide-reacts LucideIcon: these three props are
 * the only ones any of the 15 render sites actually pass. Keeping it narrow
 * means a bespoke full-colour SVG component is a drop-in replacement for a
 * lucide glyph, while LucideIcon itself stays assignable to it - so the two
 * can coexist while the icon set is migrated app by app.
 *
 * strokeWidth is accepted and ignored by full-colour icons; it only has
 * meaning for single-stroke glyphs.
 */
export type AppIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

export type AppId =
  | "about"
  | "projects"
  | "contact"
  | "files"
  | "notes"
  | "music"
  | "games"
  | "next-stop"
  | "snake"
  | "tetris"
  | "dino"
  | "doom"
  | "hextris"
  | "v86"
  | "terminal"
  | "editor"
  | "photos"
  | "video"
  | "markdown"
  | "settings"
  | "browser"
  | "pdf"
  | "resume"
  | "paint"
  | "calculator"
  | "achievements"
  | "tv"
  | "solitaire"
  | "checkers"
  | "sudoku";

export type AppCategory = "Portfolio" | "Workspace" | "Media" | "System" | "Lab";

export interface WindowPayload {
  filePath?: string;
  directoryPath?: string;
  title?: string;
  projectId?: string;
  externalUrl?: string;
  /** Settings page to open on, e.g. "sound". */
  section?: SettingsSectionId;
  /** Terminal: which profile a new tab runs (pwsh, cmd, linux). */
  profile?: string;
  /** Makes a repeated launch with the same payload distinct, so it opens a new tab. */
  launchNonce?: string;
}

export type ProcessState = "focused" | "running" | "minimized";
export type ViewportMode = "desktop" | "mobile";

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowRecord extends WindowBounds {
  id: string;
  processId: string;
  title: string;
  minimized: boolean;
  minimizedByShowDesktop?: boolean;
  maximized: boolean;
  focused: boolean;
  zIndex: number;
  restoreBounds?: WindowBounds;
  /** Which virtual desktop it lives on; absent means the first. */
  desktop?: number;
  createdAt: number;
}

export interface AppProcess {
  id: string;
  appId: AppId;
  status: ProcessState;
  launchPayload?: WindowPayload;
  createdAt: number;
}

export interface AppWindow extends WindowRecord {
  appId: AppId;
  payload?: WindowPayload;
  processStatus: ProcessState;
}

export interface DesktopGridPosition {
  gridX: number;
  gridY: number;
}

export interface DesktopGridCell extends DesktopGridPosition {
  key: string;
}

export type DesktopOccupancyMap = Record<string, string>;

export interface DesktopGridMetrics {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  paddingX: number;
  paddingY: number;
  width: number;
  height: number;
}

export interface DesktopPlacementResult {
  positions: Record<string, DesktopGridPosition>;
  placedPosition: DesktopGridPosition;
  displacedEntryId?: string;
}

/**
 * "node": a file, folder or shortcut in /Desktop. "recycle-bin": the one
 * system icon, which (as in Windows) is not a file in the Desktop folder.
 */
export type DesktopEntryKind = "node" | "recycle-bin";

export interface DesktopEntry {
  /** "desktop-node:<path>" for items in /Desktop, "system:recycle-bin" for the Recycle Bin. */
  id: string;
  kind: DesktopEntryKind;
  /** The item's filesystem path (the Recycle Bin folder for the Recycle Bin). */
  path: string;
  /** What the icon shows: the name, with .lnk hidden. */
  label: string;
  defaultGridPosition: DesktopGridPosition;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: AppIcon;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onSelect: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  title?: string;
  actions: ContextMenuAction[];
}

export interface ClipboardState {
  /** Every item that was selected when Copy/Cut ran, in selection order. */
  paths: string[];
  operation: "copy" | "cut";
}

export interface AppComponentProps {
  window: AppWindow;
}

export interface AppModule {
  default: ComponentType<AppComponentProps>;
}

export interface AppDefinition {
  id: AppId;
  title: string;
  icon: AppIcon;
  load: () => Promise<AppModule>;
  defaultSize: {
    width: number;
    height: number;
  };
  minSize?: {
    width: number;
    height: number;
  };
  resizable?: boolean;
  /** The app draws its own tab strip in the title bar, beside the caption buttons. */
  titlebarTabs?: boolean;
  multiple?: boolean;
  mobileMaximized?: boolean;
  description: string;
  category: AppCategory;
  accent: string;
  hidden?: boolean;
  defaultPosition?: {
    x: number;
    y: number;
  };
  resolveTitle?: (payload?: WindowPayload) => string;
  jumpList?: Array<{ id: string; label: string; payload?: WindowPayload }>;
}

export interface StartMenuCategoryDescriptor {
  category: AppCategory;
  label: string;
  description: string;
  icon: AppIcon;
  defaultExpanded: boolean;
}

export interface TaskbarPreviewModel {
  title: string;
  subtitle: string;
  status: "active" | "background" | "minimized";
}

export interface TaskbarWindowEntry {
  id: string;
  processId: string;
  windowId: string;
  appId: AppId;
  title: string;
  active: boolean;
  minimized: boolean;
  preview: TaskbarPreviewModel;
}

export interface ThemePreset {
  id: string;
  name: string;
  wallpaper: string;
  desktopTint: string;
  glow: string;
  shell: string;
  accent: string;
}

export type WallpaperMode = "theme" | "image" | "gradient" | "animated";

export interface DesktopWallpaperState {
  mode: WallpaperMode;
  imageSource: string | null;
  presetId: string | null;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  mode: Exclude<WallpaperMode, "theme" | "image">;
  preview: string;
  background: string;
  desktopTint?: string;
  glow?: string;
  shell?: string;
}

export interface ImageWallpaperPreset {
  id: string;
  name: string;
  source: string;
  preview: string;
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface ProjectArchitectureItem {
  title: string;
  body: string;
}

export interface FeaturedProject {
  id: string;
  title: string;
  type: string;
  oneLiner: string;
  role: string;
  challenge: string;
  outcome: string;
  hero: string;
  heroAlt?: string;
  layouts: string[];
  stack: string[];
  /** Deeper case study fields (optional). */
  problem?: string;
  architecture?: ProjectArchitectureItem[];
  technicalHighlights?: string[];
  challengesAndTradeoffs?: string;
  whatILearned?: string;
  screenshots?: string[];
  liveUrl?: string;
  repoUrl?: string;
  /** Quantified or estimated impact where NDA-safe. */
  measurableOutcome?: string;
}

export type VirtualNode = VirtualDirectory | VirtualFile;

export interface VirtualNodeBase {
  path: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Set on items in the Recycle Bin: where Restore puts them back. */
  originalPath?: string;
  /** Set on items in the Recycle Bin: when they were deleted. */
  deletedAt?: number;
}

export interface VirtualDirectory extends VirtualNodeBase {
  kind: "directory";
  /** Set on /Desktop: the version of the default shortcuts already placed there. */
  desktopSeedVersion?: number;
}

/** Where a .lnk shortcut points. */
export type ShortcutTarget =
  | { type: "app"; appId: AppId }
  | { type: "path"; path: string }
  /** A page of this site, such as the quick /portfolio view. */
  | { type: "route"; route: string }
  /** An http(s) address, opened in the Browser app. */
  | { type: "url"; url: string };

export interface VirtualFile extends VirtualNodeBase {
  kind: "file";
  mimeType: string;
  extension: string;
  content?: string;
  source?: string;
  size?: number;
  readonly?: boolean;
  /** Present on .lnk shortcuts. */
  shortcut?: ShortcutTarget;
}

export type FileSystemRecord = Record<string, VirtualNode>;

export interface FileNode {
  path: string;
  name: string;
  type: "file" | "folder";
  mimeType?: string;
  content?: unknown;
  createdAt: number;
  updatedAt: number;
  extension?: string;
  source?: string;
  size?: number;
  readonly?: boolean;
  originalPath?: string;
  deletedAt?: number;
  shortcut?: ShortcutTarget;
}

export type FileAssociationFamily =
  | "document"
  | "image"
  | "text"
  | "code"
  | "video"
  | "audio"
  | "other";

export interface FileAssociationDescriptor {
  extension: string;
  label: string;
  mimeType: string;
  family: FileAssociationFamily;
  openWith: AppId;
  editWith?: AppId;
  browserRenderable?: boolean;
  textLike?: boolean;
  capabilities: Array<"open" | "edit" | "preview" | "inline-preview" | "print">;
}
