import { DESKTOP_PATH, getDesktopNodeId } from "@/data/desktop-seed";
import { getParentPath } from "@/lib/filesystem";
import { useFileSystemStore, type FileSystemMove } from "@/stores/filesystem-store";
import { useShellStore } from "@/stores/shell-store";
import type { DesktopGridPosition } from "@/types/system";

/** Select a freshly created desktop item and drop into rename, as Windows does for "New". */
function selectAndRename(path: string) {
  const shell = useShellStore.getState();
  const id = getDesktopNodeId(path);

  shell.setSelectedIconId(id);
  shell.setRenamingIconId(id);
}

/** Desktop > New > Folder: "New folder" appears with its name ready to type over. */
export async function createDesktopFolder() {
  const path = await useFileSystemStore.getState().mkdir(`${DESKTOP_PATH}/New folder`, { uniqueName: true });
  selectAndRename(path);
  return path;
}

/** Desktop > New > Text Document. */
export async function createDesktopTextDocument() {
  const path = await useFileSystemStore.getState().writeFile(`${DESKTOP_PATH}/New Text Document.txt`, "", {
    mimeType: "text/plain",
    extension: "txt",
    uniqueName: true,
  });
  selectAndRename(path);
  return path;
}

/**
 * A file renamed inside the Desktop folder is the same icon under a new name:
 * it keeps its place, whoever renamed it (the desktop, Explorer, the terminal).
 */
export function carryDesktopPositions(moves: FileSystemMove[]) {
  const positions = useShellStore.getState().desktopIconPositions;
  const carried: Record<string, DesktopGridPosition> = {};

  moves.forEach(({ from, to }) => {
    if (getParentPath(from) !== DESKTOP_PATH || getParentPath(to) !== DESKTOP_PATH) {
      return;
    }

    const position = positions[getDesktopNodeId(from)];

    if (position) {
      carried[getDesktopNodeId(to)] = position;
    }
  });

  if (Object.keys(carried).length > 0) {
    useShellStore.getState().placeDesktopIcons(carried);
  }
}
