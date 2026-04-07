import {
  Beaker,
  BriefcaseBusiness,
  FileText,
  HardDriveDownload,
  Image,
  LayoutGrid,
  MonitorCog,
  Power,
  Settings2,
  Sparkles,
  TerminalSquare,
  Video,
} from "lucide-react";
import type { StartMenuCategoryDescriptor, StartMenuShortcut } from "@/types/system";

export const startMenuCategories: StartMenuCategoryDescriptor[] = [
  {
    category: "Portfolio",
    label: "Portfolio",
    description: "Recruiter-facing portfolio surfaces and profile apps.",
    icon: Sparkles,
    defaultExpanded: true,
  },
  {
    category: "Workspace",
    label: "Workspace",
    description: "Productivity apps, browser tools, and document workflows.",
    icon: LayoutGrid,
    defaultExpanded: true,
  },
  {
    category: "Media",
    label: "Media",
    description: "Photo, video, and rich asset viewers.",
    icon: Image,
    defaultExpanded: true,
  },
  {
    category: "Lab",
    label: "Lab",
    description: "Games, music, experiments, and emulator tooling—optional exploration.",
    icon: Beaker,
    defaultExpanded: false,
  },
  {
    category: "System",
    label: "System",
    description: "Environment controls and desktop configuration.",
    icon: Settings2,
    defaultExpanded: false,
  },
];

export const startMenuSidebarLinks: StartMenuShortcut[] = [
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    action: { type: "directory", directoryPath: "/Documents" },
  },
  {
    id: "pictures",
    label: "Pictures",
    icon: Image,
    action: { type: "directory", directoryPath: "/Media/Photography" },
  },
  {
    id: "videos",
    label: "Videos",
    icon: Video,
    action: { type: "directory", directoryPath: "/Media/Videos" },
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: TerminalSquare,
    action: { type: "app", appId: "terminal" },
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    action: { type: "app", appId: "settings" },
  },
];

export const startMenuQuickLinks: StartMenuShortcut[] = [
  {
    id: "documents-card",
    label: "Documents",
    description: "Resume, notes, and imported PDFs.",
    icon: HardDriveDownload,
    action: { type: "directory", directoryPath: "/Documents" },
  },
  {
    id: "pictures-card",
    label: "Pictures",
    description: "Photography, visual references, and image uploads.",
    icon: Image,
    action: { type: "directory", directoryPath: "/Media/Photography" },
  },
  {
    id: "videos-card",
    label: "Videos",
    description: "Reels, motion studies, and imported clips.",
    icon: Video,
    action: { type: "directory", directoryPath: "/Media/Videos" },
  },
  {
    id: "featured-work",
    label: "Featured work",
    description: "Open project case studies inside the explorer.",
    icon: BriefcaseBusiness,
    action: { type: "directory", directoryPath: "/Portfolio/Case Studies" },
  },
];

export const startMenuPowerActions: StartMenuShortcut[] = [
  {
    id: "reset-session",
    label: "Reset session",
    icon: Power,
    action: { type: "reset-session" },
    danger: true,
  },
];
