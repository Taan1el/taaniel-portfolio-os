import type { ComponentType, LazyExoticComponent } from "react";
import type { LucideIcon } from "lucide-react";

export type AppId =
  | "about"
  | "projects"
  | "contact"
  | "files"
  | "terminal"
  | "editor"
  | "photos"
  | "video"
  | "markdown"
  | "settings"
  | "resume";

export type AppCategory = "Portfolio" | "Workspace" | "Media" | "System";

export interface WindowPayload {
  filePath?: string;
  directoryPath?: string;
  title?: string;
  projectId?: string;
  externalUrl?: string;
}

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppWindow extends WindowBounds {
  id: string;
  appId: AppId;
  title: string;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  restoreBounds?: WindowBounds;
  payload?: WindowPayload;
  createdAt: number;
}

export interface DesktopIconPosition {
  x: number;
  y: number;
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
  defaultPosition: DesktopIconPosition;
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

export interface AppComponentProps {
  window: AppWindow;
}

export interface AppDefinition {
  id: AppId;
  title: string;
  description: string;
  category: AppCategory;
  icon: LucideIcon;
  accent: string;
  defaultBounds: WindowBounds;
  singleInstance?: boolean;
  component: LazyExoticComponent<ComponentType<AppComponentProps>>;
  resolveTitle?: (payload?: WindowPayload) => string;
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
  readonly?: boolean;
}

export type FileSystemRecord = Record<string, VirtualNode>;
