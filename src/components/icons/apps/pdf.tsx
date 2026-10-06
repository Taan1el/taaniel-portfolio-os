import { createAppIcon } from "../app-icon";

/**
 * PDF - Acrobat flavour: a deep red document with a cut corner fold and a white
 * plate carrying a blocky PDF wordmark. Letterforms are drawn as filled paths
 * (with evenodd counters) so no font has to load and nothing relies on strokes.
 */
export const PdfIcon = createAppIcon("PdfIcon", {
  full: (
    <>
      <path
        d="M13 4h15l11 11v25a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"
        fill="#C4171C"
      />
      <path d="M28 4l11 11H28Z" fill="#FFFFFF" />
      <rect x="12" y="22.5" width="24" height="12" rx="2" fill="#FFFFFF" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.2 25.5h5.6v5h-3.7v2h-1.9Zm1.9 1.9h1.8v1.2h-1.8Z"
        fill="#C4171C"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.2 25.5h3a3.5 3.5 0 0 1 0 7h-3Zm1.9 1.9h1.1a1.6 1.6 0 0 1 0 3.2h-1.1Z"
        fill="#C4171C"
      />
      <path
        d="M29.1 25.5h4.8v1.9H31v1.1h2.4v1.9H31v2.1h-1.9Z"
        fill="#C4171C"
      />
    </>
  ),
  micro: (
    <>
      <path
        d="M13 4h15l11 11v25a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"
        fill="#C4171C"
      />
      <path d="M28 4l11 11H28Z" fill="#FFFFFF" />
      <rect x="13" y="23" width="22" height="11" rx="2" fill="#FFFFFF" />
    </>
  ),
});
