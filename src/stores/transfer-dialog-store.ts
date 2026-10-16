import { create } from "zustand";

export interface TransferRequest {
  paths: string[];
  operation: "move" | "copy";
}

interface TransferDialogState {
  request: TransferRequest | null;
  /** Open the "Move to..." / "Copy to..." folder picker (the touch-friendly alternative to dragging). */
  open: (paths: string[], operation: TransferRequest["operation"]) => void;
  close: () => void;
}

export const useTransferDialogStore = create<TransferDialogState>((set) => ({
  request: null,
  open: (paths, operation) => (paths.length > 0 ? set({ request: { paths, operation } }) : undefined),
  close: () => set({ request: null }),
}));
