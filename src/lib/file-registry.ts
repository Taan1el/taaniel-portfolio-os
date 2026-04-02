import type { AppId, FileAssociationDescriptor, VirtualNode } from "@/types/system";
import { isNotesNode } from "@/lib/notes";

const fileAssociations: Record<string, FileAssociationDescriptor> = {
  ".bmp": {
    extension: ".bmp",
    openWith: "photos",
    editWith: "paint",
    mimeType: "image/bmp",
    family: "image",
    label: "Bitmap image",
    browserRenderable: true,
    capabilities: ["open", "edit", "preview", "inline-preview"],
  },
  ".gif": {
    extension: ".gif",
    openWith: "photos",
    editWith: "paint",
    mimeType: "image/gif",
    family: "image",
    label: "GIF image",
    browserRenderable: true,
    capabilities: ["open", "edit", "preview", "inline-preview"],
  },
  ".heic": {
    extension: ".heic",
    openWith: "photos",
    mimeType: "image/heic",
    family: "image",
    label: "HEIC image",
    capabilities: ["open", "preview"],
  },
  ".heif": {
    extension: ".heif",
    openWith: "photos",
    mimeType: "image/heif",
    family: "image",
    label: "HEIF image",
    capabilities: ["open", "preview"],
  },
  ".ico": {
    extension: ".ico",
    openWith: "photos",
    editWith: "paint",
    mimeType: "image/x-icon",
    family: "image",
    label: "Icon image",
    browserRenderable: true,
    capabilities: ["open", "edit", "preview", "inline-preview"],
  },
  ".jpg": {
    extension: ".jpg",
    openWith: "photos",
    editWith: "paint",
    mimeType: "image/jpeg",
    family: "image",
    label: "JPEG image",
    browserRenderable: true,
    capabilities: ["open", "edit", "preview", "inline-preview"],
  },
  ".jpeg": {
    extension: ".jpeg",
    openWith: "photos",
    editWith: "paint",
    mimeType: "image/jpeg",
    family: "image",
    label: "JPEG image",
    browserRenderable: true,
    capabilities: ["open", "edit", "preview", "inline-preview"],
  },
  ".jxl": {
    extension: ".jxl",
    openWith: "photos",
    mimeType: "image/jxl",
    family: "image",
    label: "JPEG XL image",
    capabilities: ["open", "preview"],
  },
  ".png": {
    extension: ".png",
    openWith: "photos",
    editWith: "paint",
    mimeType: "image/png",
    family: "image",
    label: "PNG image",
    browserRenderable: true,
    capabilities: ["open", "edit", "preview", "inline-preview"],
  },
  ".qoi": {
    extension: ".qoi",
    openWith: "photos",
    mimeType: "image/qoi",
    family: "image",
    label: "QOI image",
    capabilities: ["open", "preview"],
  },
  ".svg": {
    extension: ".svg",
    openWith: "editor",
    editWith: "editor",
    mimeType: "image/svg+xml",
    family: "code",
    label: "SVG document",
    browserRenderable: true,
    textLike: true,
    capabilities: ["open", "edit", "preview", "inline-preview"],
  },
  ".tif": {
    extension: ".tif",
    openWith: "photos",
    mimeType: "image/tiff",
    family: "image",
    label: "TIFF image",
    capabilities: ["open", "preview"],
  },
  ".tiff": {
    extension: ".tiff",
    openWith: "photos",
    mimeType: "image/tiff",
    family: "image",
    label: "TIFF image",
    capabilities: ["open", "preview"],
  },
  ".webp": {
    extension: ".webp",
    openWith: "photos",
    editWith: "paint",
    mimeType: "image/webp",
    family: "image",
    label: "WebP image",
    browserRenderable: true,
    capabilities: ["open", "edit", "preview", "inline-preview"],
  },
  ".pdf": {
    extension: ".pdf",
    openWith: "pdf",
    mimeType: "application/pdf",
    family: "document",
    label: "PDF document",
    capabilities: ["open", "preview", "print"],
  },
  ".md": {
    extension: ".md",
    openWith: "markdown",
    editWith: "editor",
    mimeType: "text/markdown",
    family: "text",
    label: "Markdown document",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".txt": {
    extension: ".txt",
    openWith: "editor",
    editWith: "editor",
    mimeType: "text/plain",
    family: "text",
    label: "Text file",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".json": {
    extension: ".json",
    openWith: "editor",
    editWith: "editor",
    mimeType: "application/json",
    family: "code",
    label: "JSON file",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".js": {
    extension: ".js",
    openWith: "editor",
    editWith: "editor",
    mimeType: "text/javascript",
    family: "code",
    label: "JavaScript file",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".jsx": {
    extension: ".jsx",
    openWith: "editor",
    editWith: "editor",
    mimeType: "text/jsx",
    family: "code",
    label: "JSX file",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".ts": {
    extension: ".ts",
    openWith: "editor",
    editWith: "editor",
    mimeType: "text/typescript",
    family: "code",
    label: "TypeScript file",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".tsx": {
    extension: ".tsx",
    openWith: "editor",
    editWith: "editor",
    mimeType: "text/tsx",
    family: "code",
    label: "TSX file",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".css": {
    extension: ".css",
    openWith: "editor",
    editWith: "editor",
    mimeType: "text/css",
    family: "code",
    label: "Stylesheet",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".html": {
    extension: ".html",
    openWith: "editor",
    editWith: "editor",
    mimeType: "text/html",
    family: "code",
    label: "HTML document",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".xml": {
    extension: ".xml",
    openWith: "editor",
    editWith: "editor",
    mimeType: "application/xml",
    family: "code",
    label: "XML document",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".yml": {
    extension: ".yml",
    openWith: "editor",
    editWith: "editor",
    mimeType: "application/yaml",
    family: "code",
    label: "YAML document",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".yaml": {
    extension: ".yaml",
    openWith: "editor",
    editWith: "editor",
    mimeType: "application/yaml",
    family: "code",
    label: "YAML document",
    textLike: true,
    capabilities: ["open", "edit", "preview"],
  },
  ".mp4": {
    extension: ".mp4",
    openWith: "video",
    mimeType: "video/mp4",
    family: "video",
    label: "MP4 video",
    browserRenderable: true,
    capabilities: ["open", "preview", "inline-preview"],
  },
  ".mov": {
    extension: ".mov",
    openWith: "video",
    mimeType: "video/quicktime",
    family: "video",
    label: "QuickTime video",
    browserRenderable: true,
    capabilities: ["open", "preview", "inline-preview"],
  },
  ".webm": {
    extension: ".webm",
    openWith: "video",
    mimeType: "video/webm",
    family: "video",
    label: "WebM video",
    browserRenderable: true,
    capabilities: ["open", "preview", "inline-preview"],
  },
  ".mp3": {
    extension: ".mp3",
    openWith: "music",
    mimeType: "audio/mpeg",
    family: "audio",
    label: "MP3 audio",
    browserRenderable: true,
    capabilities: ["open", "preview", "inline-preview"],
  },
  ".wav": {
    extension: ".wav",
    openWith: "music",
    mimeType: "audio/wav",
    family: "audio",
    label: "WAV audio",
    browserRenderable: true,
    capabilities: ["open", "preview", "inline-preview"],
  },
  ".zip": {
    extension: ".zip",
    openWith: "files",
    mimeType: "application/zip",
    family: "other",
    label: "ZIP archive",
    capabilities: ["open"],
  },
  ".img": {
    extension: ".img",
    openWith: "v86",
    mimeType: "application/octet-stream",
    family: "other",
    label: "Disk image",
    capabilities: ["open"],
  },
  ".iso": {
    extension: ".iso",
    openWith: "v86",
    mimeType: "application/x-iso9660-image",
    family: "other",
    label: "ISO image",
    capabilities: ["open"],
  },
};

export function normalizeExtensionKey(extension: string) {
  if (!extension) {
    return "";
  }

  return extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
}

export function getFileAssociationDescriptor(extension: string) {
  return fileAssociations[normalizeExtensionKey(extension)];
}

export function inferMimeTypeFromExtension(extension: string) {
  return getFileAssociationDescriptor(extension)?.mimeType ?? "application/octet-stream";
}

export function isTextLikeExtension(extension: string) {
  return Boolean(getFileAssociationDescriptor(extension)?.textLike);
}

export function supportsInlinePreview(extensionOrNode: string | VirtualNode | undefined) {
  const association =
    typeof extensionOrNode === "string"
      ? getFileAssociationDescriptor(extensionOrNode)
      : extensionOrNode?.kind === "file"
        ? getFileAssociationDescriptor(extensionOrNode.extension)
        : undefined;

  return Boolean(association?.capabilities.includes("inline-preview"));
}

export function isBrowserRenderableImageExtension(extension: string) {
  const association = getFileAssociationDescriptor(extension);
  return Boolean(association?.family === "image" && association.browserRenderable);
}

function resolveFallbackApp(node: VirtualNode) {
  if (node.kind === "directory") {
    return "files";
  }

  if (node.mimeType.startsWith("image/")) {
    return "photos";
  }

  if (node.mimeType.startsWith("audio/")) {
    return "music";
  }

  if (node.mimeType.startsWith("video/")) {
    return "video";
  }

  if (node.mimeType === "application/pdf") {
    return "pdf";
  }

  return "editor";
}

export function resolveOpenApp(node?: VirtualNode): AppId {
  if (!node) {
    return "files";
  }

  if (node.kind === "directory") {
    return "files";
  }

  if (isNotesNode(node)) {
    return "notes";
  }

  return getFileAssociationDescriptor(node.extension)?.openWith ?? resolveFallbackApp(node);
}

export function resolveEditApp(node?: VirtualNode): AppId | null {
  if (!node || node.kind === "directory") {
    return null;
  }

  if (isNotesNode(node)) {
    return "notes";
  }

  return getFileAssociationDescriptor(node.extension)?.editWith ?? (isTextLikeExtension(node.extension) ? "editor" : null);
}

export function resolveAppIdForNode(node?: VirtualNode): AppId {
  return resolveOpenApp(node);
}
