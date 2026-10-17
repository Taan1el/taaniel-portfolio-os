import { DESKTOP_PATH, getDesktopNodeId } from "@/data/desktop-seed";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useShellStore } from "@/stores/shell-store";

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
