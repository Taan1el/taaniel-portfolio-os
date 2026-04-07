/** Derive virtual file extension + MIME type from a public asset URL (supports .png, .jpg, .jpeg, .svg). */
export function getImageFileMetaFromUrl(src: string): { extension: string; mimeType: string } {
  const path = src.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".svg")) {
    return { extension: "svg", mimeType: "image/svg+xml" };
  }
  if (path.endsWith(".png")) {
    return { extension: "png", mimeType: "image/png" };
  }
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  return { extension: "jpg", mimeType: "image/jpeg" };
}
