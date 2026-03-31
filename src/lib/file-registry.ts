import type { AppId, VirtualNode } from "@/types/system";

export interface FileAssociation {
  appId: AppId;
  mimeType: string;
  label: string;
  browserRenderable?: boolean;
  textLike?: boolean;
}

const fileAssociations: Record<string, FileAssociation> = {
  ".bmp": { appId: "photos", mimeType: "image/bmp", label: "Bitmap image", browserRenderable: true },
  ".gif": { appId: "photos", mimeType: "image/gif", label: "Animated image", browserRenderable: true },
  ".heic": { appId: "photos", mimeType: "image/heic", label: "HEIC image" },
  ".heif": { appId: "photos", mimeType: "image/heif", label: "HEIF image" },
  ".ico": { appId: "photos", mimeType: "image/x-icon", label: "Icon image", browserRenderable: true },
  ".jpg": { appId: "photos", mimeType: "image/jpeg", label: "JPEG image", browserRenderable: true },
  ".jpeg": { appId: "photos", mimeType: "image/jpeg", label: "JPEG image", browserRenderable: true },
  ".jxl": { appId: "photos", mimeType: "image/jxl", label: "JPEG XL image" },
  ".png": { appId: "photos", mimeType: "image/png", label: "PNG image", browserRenderable: true },
  ".qoi": { appId: "photos", mimeType: "image/qoi", label: "QOI image" },
  ".tif": { appId: "photos", mimeType: "image/tiff", label: "TIFF image" },
  ".tiff": { appId: "photos", mimeType: "image/tiff", label: "TIFF image" },
  ".webp": { appId: "photos", mimeType: "image/webp", label: "WebP image", browserRenderable: true },
  ".svg": {
    appId: "editor",
    mimeType: "image/svg+xml",
    label: "SVG document",
    browserRenderable: true,
    textLike: true,
  },
  ".pdf": { appId: "pdf", mimeType: "application/pdf", label: "PDF document" },
  ".md": { appId: "markdown", mimeType: "text/markdown", label: "Markdown document", textLike: true },
  ".txt": { appId: "editor", mimeType: "text/plain", label: "Text file", textLike: true },
  ".json": { appId: "editor", mimeType: "application/json", label: "JSON file", textLike: true },
  ".js": { appId: "editor", mimeType: "text/javascript", label: "JavaScript file", textLike: true },
  ".jsx": { appId: "editor", mimeType: "text/jsx", label: "JSX file", textLike: true },
  ".ts": { appId: "editor", mimeType: "text/typescript", label: "TypeScript file", textLike: true },
  ".tsx": { appId: "editor", mimeType: "text/tsx", label: "TSX file", textLike: true },
  ".css": { appId: "editor", mimeType: "text/css", label: "Stylesheet", textLike: true },
  ".html": { appId: "editor", mimeType: "text/html", label: "HTML document", textLike: true },
  ".xml": { appId: "editor", mimeType: "application/xml", label: "XML document", textLike: true },
  ".yml": { appId: "editor", mimeType: "application/yaml", label: "YAML document", textLike: true },
  ".yaml": { appId: "editor", mimeType: "application/yaml", label: "YAML document", textLike: true },
  ".mp4": { appId: "video", mimeType: "video/mp4", label: "MP4 video", browserRenderable: true },
  ".mov": { appId: "video", mimeType: "video/quicktime", label: "QuickTime video", browserRenderable: true },
  ".webm": { appId: "video", mimeType: "video/webm", label: "WebM video", browserRenderable: true },
  ".mp3": { appId: "video", mimeType: "audio/mpeg", label: "MP3 audio", browserRenderable: true },
  ".wav": { appId: "video", mimeType: "audio/wav", label: "WAV audio", browserRenderable: true },
};

export function normalizeExtensionKey(extension: string) {
  if (!extension) {
    return "";
  }

  return extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
}

export function getFileAssociation(extension: string) {
  return fileAssociations[normalizeExtensionKey(extension)];
}

export function inferMimeTypeFromExtension(extension: string) {
  return getFileAssociation(extension)?.mimeType ?? "application/octet-stream";
}

export function isTextLikeExtension(extension: string) {
  return Boolean(getFileAssociation(extension)?.textLike);
}

export function isBrowserRenderableImageExtension(extension: string) {
  const association = getFileAssociation(extension);
  return Boolean(association?.appId === "photos" && association.browserRenderable);
}

export function resolveAppIdForNode(node?: VirtualNode): AppId {
  if (!node) {
    return "files";
  }

  if (node.kind === "directory") {
    return "files";
  }

  const association = getFileAssociation(node.extension);

  if (association) {
    return association.appId;
  }

  if (node.mimeType.startsWith("image/")) {
    return "photos";
  }

  if (node.mimeType.startsWith("video/") || node.mimeType.startsWith("audio/")) {
    return "video";
  }

  if (node.mimeType === "application/pdf") {
    return "pdf";
  }

  return "editor";
}
