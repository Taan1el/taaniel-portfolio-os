export function canToggleFullscreen() {
  return typeof document !== "undefined" && document.fullscreenEnabled;
}

export async function toggleDocumentFullscreen() {
  if (!canToggleFullscreen()) {
    return false;
  }

  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return true;
  }

  await document.documentElement.requestFullscreen();
  return true;
}
