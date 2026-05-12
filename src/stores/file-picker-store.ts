import { create } from "zustand";

export type FilePickerMode = "open" | "save";

export interface FilePickerRequest {
  mode: FilePickerMode;
  title: string;
  /** Lowercase extensions (".png", ".mp3"). Empty = accept everything. */
  accept: string[];
  /** For save mode: suggested filename. */
  suggestedName?: string;
  /** For save mode: suggested directory path. */
  suggestedDirectory?: string;
}

export interface FilePickerResult {
  /** For open: the selected file path. For save: the chosen full path. */
  path: string;
}

interface PendingRequest extends FilePickerRequest {
  resolve: (result: FilePickerResult | null) => void;
}

interface FilePickerState {
  pending: PendingRequest | null;
  request: (req: FilePickerRequest) => Promise<FilePickerResult | null>;
  resolve: (result: FilePickerResult | null) => void;
}

export const useFilePickerStore = create<FilePickerState>((set, get) => ({
  pending: null,
  request(req) {
    // Reject any previous pending request — only one picker at a time.
    const previous = get().pending;
    if (previous) previous.resolve(null);

    return new Promise<FilePickerResult | null>((resolve) => {
      set({ pending: { ...req, resolve } });
    });
  },
  resolve(result) {
    const pending = get().pending;
    if (!pending) return;
    pending.resolve(result);
    set({ pending: null });
  },
}));
