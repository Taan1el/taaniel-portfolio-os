/** True when the visitor asked for less motion, in Settings or in their own system. */
export function prefersStillMotion() {
  return (
    document.documentElement.hasAttribute("data-reduce-motion") ||
    Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}
