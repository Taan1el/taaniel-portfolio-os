import { create } from "zustand";

export interface ConfirmRequest {
  title: string;
  message: string;
  /** The button that goes ahead, named for what it does ("Delete", "Empty"). */
  confirmLabel: string;
}

interface ConfirmDialogState {
  request: (ConfirmRequest & { id: number }) | null;
  /** Show the dialog. Resolves true when the visitor goes ahead, false for Cancel, Escape or a click outside. */
  ask: (request: ConfirmRequest) => Promise<boolean>;
  answer: (accepted: boolean) => void;
}

let settle: ((accepted: boolean) => void) | null = null;
let counter = 0;

/**
 * A question for the visitor answered inside the OS, in the same look as the
 * rest of the shell, instead of the browser's own window.confirm (which looks
 * foreign and is silently answered "no" where dialogs are blocked).
 */
export const useConfirmDialogStore = create<ConfirmDialogState>((set) => ({
  request: null,
  ask: (request) =>
    new Promise<boolean>((resolve) => {
      // A question that is still open is dropped, never left hanging.
      settle?.(false);
      settle = resolve;
      counter += 1;
      set({ request: { ...request, id: counter } });
    }),
  answer: (accepted) => {
    const resolve = settle;
    settle = null;
    set({ request: null });
    resolve?.(accepted);
  },
}));

/** Ask the visitor to confirm something that can't be undone. */
export function confirmInOs(request: ConfirmRequest) {
  return useConfirmDialogStore.getState().ask(request);
}
