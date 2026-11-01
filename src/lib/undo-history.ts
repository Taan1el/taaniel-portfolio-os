/** Undo and redo for anything that can be snapshotted: a canvas, a board, a sheet. */
export class UndoHistory<T> {
  private past: T[] = [];
  private future: T[] = [];

  constructor(private readonly limit = 50) {}

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  /** Call with the state as it was just before a change. A new change ends any redo. */
  record(before: T, limit = this.limit) {
    this.past.push(before);
    while (this.past.length > limit) this.past.shift();
    this.future = [];
  }

  undo(current: T): T | undefined {
    const previous = this.past.pop();
    if (previous !== undefined) this.future.push(current);
    return previous;
  }

  redo(current: T): T | undefined {
    const next = this.future.pop();
    if (next !== undefined) this.past.push(current);
    return next;
  }

  clear() {
    this.past = [];
    this.future = [];
  }
}

/** True for Ctrl or Cmd with Z; `redo` is Shift+Z or Y. */
export function undoKey(event: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
  if (!event.ctrlKey && !event.metaKey) return null;
  const key = event.key.toLowerCase();
  if (key === "y" || (key === "z" && event.shiftKey)) return "redo";
  return key === "z" ? "undo" : null;
}
