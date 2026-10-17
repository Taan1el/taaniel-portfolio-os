/*
 * Files and folders inside the OS are dragged with pointer events (see
 * lib/dnd). The browser's own drag and drop is only used for the one thing it
 * is needed for: files dragged in from the visitor's computer.
 */

/** True when a native drag carries files from outside the page (an upload). */
export function hasExternalFiles(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }

  return Array.from(dataTransfer.types ?? []).includes("Files");
}
