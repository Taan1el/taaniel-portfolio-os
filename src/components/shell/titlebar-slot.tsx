import { createContext, useContext } from "react";

/**
 * The title bar area a window hands to its app, for apps that draw their own
 * tabs up there (like a real browser). Null when the app renders outside a
 * window frame, so the app falls back to rendering the strip inline.
 */
export const TitlebarSlotContext = createContext<HTMLElement | null>(null);

export const useTitlebarSlot = () => useContext(TitlebarSlotContext);
