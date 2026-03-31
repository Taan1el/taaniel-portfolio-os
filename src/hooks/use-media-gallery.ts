import { useMemo } from "react";
import { getParentPath, listChildren, normalizePath } from "@/lib/filesystem";
import type { FileSystemRecord, VirtualFile } from "@/types/system";

type MediaFileMatcher = (node: VirtualFile) => boolean;

export function useMediaGallery(
  nodes: FileSystemRecord,
  filePath: string,
  matcher: MediaFileMatcher
) {
  const normalizedPath = normalizePath(filePath);
  const directoryPath = getParentPath(normalizedPath);
  const siblings = useMemo(
    () =>
      listChildren(nodes, directoryPath).filter(
        (node): node is VirtualFile => node.kind === "file" && matcher(node)
      ),
    [directoryPath, matcher, nodes]
  );
  const currentIndex = siblings.findIndex((item) => item.path === normalizedPath);

  return {
    filePath: normalizedPath,
    directoryPath,
    siblings,
    currentIndex,
    previous: currentIndex > 0 ? siblings[currentIndex - 1] : null,
    next: currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null,
  };
}
