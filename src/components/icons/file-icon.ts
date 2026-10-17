import {
  BrowserIcon,
  EditorIcon,
  FileIcon,
  FolderIcon,
  MarkdownIcon,
  MusicIcon,
  PdfIcon,
  PhotosIcon,
  PortfolioIcon,
  RecycleBinEmptyIcon,
  RecycleBinFullIcon,
  VideoIcon,
} from "@/components/icons/apps";
import { getAppDefinition } from "@/lib/app-registry";
import { sanitizeShortcutTarget } from "@/lib/shortcuts";
import { TRASH_PATH } from "@/lib/system-workspace";
import type { AppIcon, FileSystemRecord, ShortcutTarget } from "@/types/system";

const CODE_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "css", "scss", "html", "json", "py", "sh", "ps1", "yml", "yaml"]);

interface IconTarget {
  path: string;
  /** FileNode uses `type`, VirtualNode uses `kind`; either works. */
  type?: "file" | "folder";
  kind?: "file" | "directory";
  extension?: string;
  mimeType?: string;
}

/** The icon Explorer, the desktop and dialogs show for a file or folder. */
export function getFileIcon(target: IconTarget, options: { recycleBinFull?: boolean } = {}): AppIcon {
  const isFolder = target.type === "folder" || target.kind === "directory";

  if (isFolder) {
    if (target.path === TRASH_PATH) return options.recycleBinFull ? RecycleBinFullIcon : RecycleBinEmptyIcon;
    return FolderIcon;
  }

  const extension = (target.extension ?? target.path.split(".").pop() ?? "").toLowerCase();
  const mime = target.mimeType ?? "";

  if (extension === "pdf" || mime === "application/pdf") return PdfIcon;
  if (extension === "md" || mime === "text/markdown") return MarkdownIcon;
  if (mime.startsWith("image/")) return PhotosIcon;
  if (mime.startsWith("audio/")) return MusicIcon;
  if (mime.startsWith("video/")) return VideoIcon;
  if (CODE_EXTENSIONS.has(extension)) return EditorIcon;
  return FileIcon;
}

/** Shortcuts pointing at shortcuts are followed this far, then drawn as a plain file. */
const MAX_ICON_HOPS = 4;

/**
 * The icon a shortcut wears: the app it runs, or the icon of the file or folder
 * it points at - as Windows draws a .lnk, minus the arrow overlay (see NodeIcon).
 */
export function getShortcutIcon(shortcut: ShortcutTarget, nodes: FileSystemRecord, hops = 0): AppIcon {
  const target = sanitizeShortcutTarget(shortcut);

  if (!target || hops >= MAX_ICON_HOPS) {
    return FileIcon;
  }

  switch (target.type) {
    case "app":
      return getAppDefinition(target.appId).icon;
    case "route":
      // A page of this site carries the portfolio mark, never the Browser icon.
      return target.route === "/portfolio" ? PortfolioIcon : BrowserIcon;
    case "url":
      return BrowserIcon;
    case "path": {
      const next = nodes[target.path];

      if (!next) return FileIcon;
      if (next.kind === "directory") return getFileIcon(next);
      if (next.shortcut) return getShortcutIcon(next.shortcut, nodes, hops + 1);
      return getFileIcon(next);
    }
  }
}

/** Windows-style "Type" column text: "File folder", "Text Document", "PNG File". */
export function describeFileType(target: IconTarget) {
  if (target.type === "folder" || target.kind === "directory") return "File folder";
  const extension = (target.extension ?? target.path.split(".").pop() ?? "").toLowerCase();
  const known: Record<string, string> = {
    lnk: "Shortcut",
    txt: "Text Document",
    md: "Markdown File",
    pdf: "PDF Document",
    json: "JSON File",
    html: "HTML Document",
    css: "CSS File",
    ts: "TypeScript File",
    tsx: "TypeScript File",
    js: "JavaScript File",
    mp3: "MP3 File",
    wav: "WAV File",
    mp4: "MP4 Video",
  };
  if (known[extension]) return known[extension];
  return extension ? `${extension.toUpperCase()} File` : "File";
}
