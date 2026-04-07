/** Visible “proof” copy for recruiters — not buried in the virtual filesystem. */
export const portfolioBuilt = {
  headline: "How this portfolio is built",
  stack: ["React 18", "TypeScript", "Vite", "Zustand", "IndexedDB (idb-keyval)", "pdf.js", "Framer Motion", "react-rnd"],
  architectureSummary:
    "A single-page app that simulates a desktop: window manager + process model, virtual filesystem with persistence, lazy-loaded app modules, and a small AI-assisted search layer (optional Hugging Face workers).",
  decisions: [
    "Chose Zustand with shallow selectors to keep window/taskbar updates predictable without prop drilling.",
    "IndexedDB backs the filesystem so uploads and layout tweaks survive refresh—closer to a real OS than session-only state.",
    "Apps load with React.lazy from a central registry so the initial bundle stays smaller than importing every viewer up front.",
    "Added a static /simple route for hiring managers who need a 30-second scan without learning desktop affordances.",
  ],
};
