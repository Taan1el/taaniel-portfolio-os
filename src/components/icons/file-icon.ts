import {
  EditorIcon,
  FileIcon,
  FolderIcon,
  MarkdownIcon,
  MusicIcon,
  PdfIcon,
  PhotosIcon,
  RecycleBinEmptyIcon,
  RecycleBinFullIcon,
  VideoIcon,
} from "@/components/icons/apps";
import { TRASH_PATH } from "@/lib/system-workspace";
import type { AppIcon } from "@/types/system";

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

/** Windows-style "Type" column text: "File folder", "Text Document", "PNG File". */
export function describeFileType(target: IconTarget) {
  if (target.type === "folder" || target.kind === "directory") return "File folder";
  const extension = (target.extension ?? target.path.split(".").pop() ?? "").toLowerCase();
  const known: Record<string, string> = {
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
