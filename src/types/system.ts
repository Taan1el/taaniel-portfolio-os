import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export type AppId =
  | "about"
  | "projects"
  | "contact"
  | "files"
  | "notes"
  | "music"
  | "games"
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
  | "paint";

export type AppCategory = "Portfolio" | "Workspace" | "Media" | "System";

export interface WindowPayload {
  filePath?: string;
  directoryPath?: string;
  title?: string;
  projectId?: string;
  externalUrl?: string;
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

export type DesktopEntryType = "app" | "file" | "folder" | "link";

export interface DesktopEntry {
  id: string;
  label: string;
  type: DesktopEntryType;
  appId?: AppId;
  filePath?: string;
  directoryPath?: string;
  externalUrl?: string;
  defaultGridPosition: DesktopGridPosition;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  title?: string;
  actions: ContextMenuAction[];
}

export interface ClipboardState {
  path: string;
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
  icon: LucideIcon;
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
}

export type StartMenuAction =
  | { type: "app"; appId: AppId }
  | { type: "directory"; directoryPath: string }
  | { type: "file"; filePath: string }
  | { type: "reset-session" };

export interface StartMenuShortcut {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  action: StartMenuAction;
  danger?: boolean;
}

export interface StartMenuCategoryDescriptor {
  category: AppCategory;
  label: string;
  description: string;
  icon: LucideIcon;
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

export interface SocialLink {
  label: string;
  url: string;
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
  layouts: string[];
  stack: string[];
}

export type VirtualNode = VirtualDirectory | VirtualFile;

export interface VirtualNodeBase {
  path: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface VirtualDirectory extends VirtualNodeBase {
  kind: "directory";
}

export interface VirtualFile extends VirtualNodeBase {
  kind: "file";
  mimeType: string;
  extension: string;
  content?: string;
  source?: string;
  size?: number;
  readonly?: boolean;
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
