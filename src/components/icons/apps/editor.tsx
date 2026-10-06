import { createAppIcon } from "../app-icon";

/**
 * Editor - VS Code flavour: the folded angular ribbon, split into a light upper
 * facet and a deeper lower facet along the notch line so it carries two flat
 * blues instead of the flat single tone of the original mark.
 */
export const EditorIcon = createAppIcon("EditorIcon", {
  full: (
    <>
      <path d="M38 4.5V24H19l-9-7.5 3.5-4L20 18Z" fill="#4A9FEE" />
      <path d="M38 24v19.5L20 30l-6.5 5.5L10 31.5 19 24Z" fill="#0C6CC4" />
    </>
  ),
  micro: (
    <>
      <path
        d="M38 5v38L20 30l-7 5.5L10 31.5 19 24l-9-7.5L13 12.5l7 5.5Z"
        fill="#0E75CC"
      />
    </>
  ),
});
