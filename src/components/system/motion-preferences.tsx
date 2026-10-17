import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

/**
 * Applies the "Animation effects" setting to every framer-motion animation in
 * the app. Off, motion follows the operating system's own reduce-motion
 * preference ("user"); on, transform and layout animations are always skipped.
 */
export function MotionPreferences({ children }: { children: ReactNode }) {
  const reduceMotion = useSystemSettingsStore((state) => state.reduceMotion);

  return <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>{children}</MotionConfig>;
}
