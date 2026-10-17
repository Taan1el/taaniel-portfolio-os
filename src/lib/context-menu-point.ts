/**
 * Where to open a context menu for an event. The Menu key and Shift+F10 fire
 * `contextmenu` with no pointer position (0, 0); then the menu opens on the
 * element, as it does in Windows.
 */
export function getContextMenuPoint(event: { clientX: number; clientY: number; currentTarget: EventTarget | null }) {
  const element = event.currentTarget as HTMLElement | null;

  if (event.clientX === 0 && event.clientY === 0 && element?.getBoundingClientRect) {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  }

  return { x: event.clientX, y: event.clientY };
}
