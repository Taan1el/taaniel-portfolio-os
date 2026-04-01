import { lazy } from "react";
import {
  Bird,
  BookText,
  Blocks,
  BriefcaseBusiness,
  Brush,
  Clapperboard,
  Code2,
  FolderOpen,
  Gamepad2,
  Globe2,
  Image,
  Mail,
  MonitorCog,
  Music4,
  Cpu,
  ScrollText,
  TerminalSquare,
  UserRound,
  Waypoints,
} from "lucide-react";
import { getBaseName } from "@/lib/utils";
import type { AppDefinition, AppId } from "@/types/system";

const AboutApp = lazy(async () => ({
  default: (await import("@/components/apps/about-app")).AboutApp,
}));
const ProjectsApp = lazy(async () => ({
  default: (await import("@/components/apps/projects-app")).ProjectsApp,
}));
const ContactApp = lazy(async () => ({
  default: (await import("@/components/apps/contact-app")).ContactApp,
}));
const FileExplorerApp = lazy(async () => ({
  default: (await import("@/components/apps/file-explorer-app")).FileExplorerApp,
}));
const TerminalApp = lazy(async () => ({
  default: (await import("@/components/apps/terminal-app")).TerminalApp,
}));
const CodeEditorApp = lazy(async () => ({
  default: (await import("@/components/apps/code-editor-app")).CodeEditorApp,
}));
const NotesApp = lazy(async () => ({
  default: (await import("@/components/apps/notes-app")).NotesApp,
}));
const VideoPlayerApp = lazy(async () => ({
  default: (await import("@/components/apps/media-viewer-app")).MediaViewerApp,
}));
const MusicPlayerApp = lazy(async () => ({
  default: (await import("@/components/apps/music-player-app")).MusicPlayerApp,
}));
const GamesApp = lazy(async () => ({
  default: (await import("@/components/apps/games-app")).GamesApp,
}));
const SnakeApp = lazy(async () => ({
  default: (await import("@/components/apps/snake-app")).SnakeApp,
}));
const TetrisApp = lazy(async () => ({
  default: (await import("@/components/apps/tetris-app")).TetrisApp,
}));
const DinoApp = lazy(async () => ({
  default: (await import("@/components/apps/dino-app")).DinoApp,
}));
const VirtualX86App = lazy(async () => ({
  default: (await import("@/components/apps/v86-app")).VirtualX86App,
}));
const PhotoViewerApp = lazy(async () => ({
  default: (await import("@/components/apps/photo-viewer-app")).PhotoViewerApp,
}));
const MarkdownViewerApp = lazy(async () => ({
  default: (await import("@/components/apps/markdown-viewer-app")).MarkdownViewerApp,
}));
const SettingsApp = lazy(async () => ({
  default: (await import("@/components/apps/settings-app")).SettingsApp,
}));
const BrowserApp = lazy(async () => ({
  default: (await import("@/components/apps/browser-app")).BrowserApp,
}));
const PdfViewerApp = lazy(async () => ({
  default: (await import("@/components/apps/pdf-viewer-app")).PdfViewerApp,
}));
const PaintApp = lazy(async () => ({
  default: (await import("@/components/apps/paint-app")).PaintApp,
}));

const registry: Record<AppId, AppDefinition> = {
  about: {
    id: "about",
    title: "About",
    description: "Bio, strengths, skills, and recruiter summary.",
    category: "Portfolio",
    icon: UserRound,
    accent: "#7bd0ff",
    defaultBounds: { x: 120, y: 88, width: 880, height: 640 },
    singleInstance: true,
    component: AboutApp,
  },
  projects: {
    id: "projects",
    title: "Projects",
    description: "Featured work, visuals, and case study launchers.",
    category: "Portfolio",
    icon: BriefcaseBusiness,
    accent: "#ff9960",
    defaultBounds: { x: 152, y: 96, width: 980, height: 680 },
    singleInstance: true,
    component: ProjectsApp,
  },
  contact: {
    id: "contact",
    title: "Contact",
    description: "Direct contact options and social links.",
    category: "Portfolio",
    icon: Mail,
    accent: "#ffd374",
    defaultBounds: { x: 198, y: 118, width: 720, height: 520 },
    singleInstance: true,
    component: ContactApp,
  },
  files: {
    id: "files",
    title: "File Explorer",
    description: "Browse the virtual filesystem and open portfolio assets.",
    category: "Workspace",
    icon: FolderOpen,
    accent: "#84b6ff",
    defaultBounds: { x: 176, y: 84, width: 940, height: 640 },
    component: FileExplorerApp,
    resolveTitle: (payload) =>
      payload?.directoryPath ? `Explorer - ${getBaseName(payload.directoryPath)}` : "File Explorer",
  },
  notes: {
    id: "notes",
    title: "Notes",
    description: "Create and edit plain text notes and markdown files.",
    category: "Workspace",
    icon: BookText,
    accent: "#ffe58f",
    defaultBounds: { x: 200, y: 100, width: 900, height: 600 },
    component: NotesApp,
    resolveTitle: (payload) =>
      payload?.filePath
        ? `Notes - ${getBaseName(payload.filePath)}`
        : "Notes",
  },
  music: {
    id: "music",
    title: "Music Player",
    description: "Mini player for local MP3 and WAV files with a folder-based playlist.",
    category: "Media",
    icon: Music4,
    accent: "#82f4d7",
    defaultBounds: { x: 218, y: 104, width: 860, height: 600 },
    singleInstance: true,
    component: MusicPlayerApp,
    resolveTitle: (payload) =>
      payload?.filePath ? `Music - ${getBaseName(payload.filePath)}` : "Music Player",
  },
  games: {
    id: "games",
    title: "Games",
    description: "Arcade hub with lightweight browser games inside the desktop shell.",
    category: "Media",
    icon: Gamepad2,
    accent: "#8ba8ff",
    defaultBounds: { x: 212, y: 100, width: 900, height: 620 },
    singleInstance: true,
    component: GamesApp,
  },
  snake: {
    id: "snake",
    title: "Snake",
    description: "Classic grid-based arcade game with keyboard controls.",
    category: "Media",
    icon: Waypoints,
    accent: "#8bff9f",
    defaultBounds: { x: 258, y: 126, width: 760, height: 560 },
    singleInstance: true,
    component: SnakeApp,
  },
  tetris: {
    id: "tetris",
    title: "Tetris",
    description: "Stack, rotate, and clear lines in a compact windowed board.",
    category: "Media",
    icon: Blocks,
    accent: "#84b6ff",
    defaultBounds: { x: 244, y: 110, width: 780, height: 640 },
    singleInstance: true,
    component: TetrisApp,
  },
  dino: {
    id: "dino",
    title: "Dino",
    description: "Offline runner-inspired game with click and keyboard jumps.",
    category: "Media",
    icon: Bird,
    accent: "#ffd27d",
    defaultBounds: { x: 252, y: 132, width: 760, height: 520 },
    singleInstance: true,
    component: DinoApp,
  },
  v86: {
    id: "v86",
    title: "Virtual x86",
    description: "Boot imported .img and .iso files in a resizable browser emulator.",
    category: "System",
    icon: Cpu,
    accent: "#7dd5ff",
    defaultBounds: { x: 198, y: 86, width: 960, height: 720 },
    component: VirtualX86App,
    resolveTitle: (payload) =>
      payload?.filePath ? `Virtual x86 - ${getBaseName(payload.filePath)}` : "Virtual x86",
  },
  terminal: {
    id: "terminal",
    title: "Terminal",
    description: "Explore the portfolio through commands and files.",
    category: "Workspace",
    icon: TerminalSquare,
    accent: "#92ffb6",
    defaultBounds: { x: 214, y: 126, width: 820, height: 520 },
    singleInstance: true,
    component: TerminalApp,
  },
  editor: {
    id: "editor",
    title: "Code Editor",
    description: "Monaco editor for virtual text and code files.",
    category: "Workspace",
    icon: Code2,
    accent: "#7fa2ff",
    defaultBounds: { x: 186, y: 92, width: 900, height: 620 },
    component: CodeEditorApp,
    resolveTitle: (payload) => (payload?.filePath ? `Editor - ${getBaseName(payload.filePath)}` : "Code Editor"),
  },
  photos: {
    id: "photos",
    title: "Photos",
    description: "Image viewer for photography and project visuals.",
    category: "Media",
    icon: Image,
    accent: "#f8a6ff",
    defaultBounds: { x: 216, y: 104, width: 900, height: 640 },
    component: PhotoViewerApp,
    resolveTitle: (payload) => (payload?.filePath ? `Photos - ${getBaseName(payload.filePath)}` : "Photos"),
  },
  video: {
    id: "video",
    title: "Video Player",
    description: "Plays a selected video file or demo reel.",
    category: "Media",
    icon: Clapperboard,
    accent: "#84fff2",
    defaultBounds: { x: 238, y: 116, width: 920, height: 620 },
    component: VideoPlayerApp,
    resolveTitle: (payload) => (payload?.filePath ? `Video - ${getBaseName(payload.filePath)}` : "Video Player"),
  },
  markdown: {
    id: "markdown",
    title: "Markdown Viewer",
    description: "Reader for portfolio notes, docs, and case studies.",
    category: "Workspace",
    icon: ScrollText,
    accent: "#ffcf8f",
    defaultBounds: { x: 178, y: 92, width: 820, height: 600 },
    component: MarkdownViewerApp,
    resolveTitle: (payload) =>
      payload?.filePath ? `Document - ${getBaseName(payload.filePath)}` : "Markdown Viewer",
  },
  settings: {
    id: "settings",
    title: "Settings",
    description: "Theme, wallpaper, and desktop environment preferences.",
    category: "System",
    icon: MonitorCog,
    accent: "#bfa7ff",
    defaultBounds: { x: 248, y: 122, width: 780, height: 560 },
    singleInstance: true,
    component: SettingsApp,
  },
  browser: {
    id: "browser",
    title: "Browser",
    description: "Embedded link workspace for external sites and bookmarks.",
    category: "Workspace",
    icon: Globe2,
    accent: "#8be0ff",
    defaultBounds: { x: 188, y: 82, width: 940, height: 660 },
    component: BrowserApp,
    resolveTitle: (payload) => payload?.externalUrl ?? "Browser",
  },
  pdf: {
    id: "pdf",
    title: "PDF Viewer",
    description: "Page-based PDF reading, zooming, and printing.",
    category: "Workspace",
    icon: BookText,
    accent: "#ffe58f",
    defaultBounds: { x: 208, y: 84, width: 880, height: 660 },
    component: PdfViewerApp,
    resolveTitle: (payload) => (payload?.filePath ? getBaseName(payload.filePath) : "PDF Viewer"),
  },
  paint: {
    id: "paint",
    title: "Paint",
    description: "Minimal image editing workspace for portfolio assets and uploads.",
    category: "Media",
    icon: Brush,
    accent: "#ffb680",
    defaultBounds: { x: 198, y: 84, width: 900, height: 640 },
    component: PaintApp,
    resolveTitle: (payload) => (payload?.filePath ? `Paint - ${getBaseName(payload.filePath)}` : "Paint"),
  },
  resume: {
    id: "resume",
    title: "Resume",
    description: "Inline resume viewer with download access.",
    category: "Portfolio",
    icon: BookText,
    accent: "#ffe58f",
    defaultBounds: { x: 208, y: 84, width: 860, height: 640 },
    hidden: true,
    component: PdfViewerApp,
    resolveTitle: (payload) => (payload?.filePath ? getBaseName(payload.filePath) : "Resume"),
  },
};

export function getAppRegistry() {
  return Object.values(registry).filter((app) => !app.hidden);
}

export function getAppDefinition(appId: AppId) {
  return registry[appId];
}
