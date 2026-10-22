import { create } from "zustand";
import type { DragItem, DragOrigin, DropPlan } from "@/lib/dnd/types";

/** What a hover is about to do, so the ghost can say so ("Opening..."). */
export type DragHover = "restore-window" | "open-folder";

/** The drag in progress. Created when the pointer has really started dragging, cleared on drop or cancel. */
export interface DragSession {
  items: DragItem[];
  origin: DragOrigin;
  originWindowId?: string;
  pointerType: string;
  /** 0 for the primary button (or a touch), 2 for a right-button drag. */
  button: number;
  /** Pointer position in client coordinates. */
  x: number;
  y: number;
  /** Where inside the grabbed icon the pointer was, for placing icons on the desktop grid. */
  grab: { x: number; y: number };
  plan: DropPlan;
  /** True when the pointer is over something that could take a drop (even if this drop is refused). */
  overZone: boolean;
  hover: DragHover | null;
}

interface DragStoreState {
  session: DragSession | null;
}

export const useDragStore = create<DragStoreState>(() => ({ session: null }));

export function getDragSession() {
  return useDragStore.getState().session;
}
