import { useMemo } from "react";
import { getParentPath, listChildren, normalizePath } from "@/lib/filesystem";
import type { FileSystemRecord, VirtualFile } from "@/types/system";

type MediaFileMatcher = (node: VirtualFile) => boolean;

export function useMediaGallery(
  nodes: FileSystemRecord,
  filePath: string,
  matcher: MediaFileMatcher
) {
  const requestedPath = normalizePath(filePath);
  const directoryPath = getParentPath(requestedPath);
  const siblings = useMemo(
    () =>
      listChildren(nodes, directoryPath).filter(
        (node): node is VirtualFile => node.kind === "file" && matcher(node)
      ),
    [directoryPath, matcher, nodes]
  );
  const resolvedPath = siblings.some((item) => item.path === requestedPath)
    ? requestedPath
    : siblings[0]?.path ?? requestedPath;
  const currentIndex = siblings.findIndex((item) => item.path === resolvedPath);

  return {
    filePath: resolvedPath,
    directoryPath,
    siblings,
    currentIndex,
    previous: currentIndex > 0 ? siblings[currentIndex - 1] : null,
    next: currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null,
  };
}
