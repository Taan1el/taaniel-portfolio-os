import type { DragModifiers, DragOperation } from "@/lib/dnd/types";

/**
 * Windows' drag rules: a plain drag moves (within one drive), Ctrl copies,
 * Alt or Ctrl+Shift creates shortcuts, and Shift moves explicitly.
 */
export function operationFromModifiers({ ctrl, shift, alt }: DragModifiers): DragOperation {
  if (alt || (ctrl && shift)) {
    return "link";
  }

  return ctrl ? "copy" : "move";
}

/** The tooltip Windows shows beside the pointer: "Move to Documents". */
export function describeOperation(operation: DragOperation, destinationLabel: string, destinationIsFolder = true) {
  switch (operation) {
    case "copy":
      return `Copy to ${destinationLabel}`;
    case "link":
      return `Create link in ${destinationLabel}`;
    default:
      return destinationIsFolder ? `Move to ${destinationLabel}` : `Move ${destinationLabel}`;
  }
}

export function readModifiers(event: { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey?: boolean }): DragModifiers {
  return { ctrl: event.ctrlKey || Boolean(event.metaKey), shift: event.shiftKey, alt: event.altKey };
}
