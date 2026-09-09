/** Visible "proof" copy for recruiters — not buried in the virtual filesystem. */
export const portfolioBuilt = {
  headline: "How this portfolio is built",
  stack: ["React 19", "TypeScript", "Vite", "Zustand", "IndexedDB", "pdf.js", "Framer Motion", "react-rnd"],
  architectureSummary:
    "A React and TypeScript web application with draggable and resizable windows and a browser-local virtual filesystem. It simulates a desktop interface; it is not an operating system.",
  decisions: [
    "Zustand stores manage windows, processes, and shell state.",
    "IndexedDB stores virtual files; shell and window settings use localStorage. Browser storage can be cleared.",
    "App modules use dynamic imports and React.lazy to defer their code until needed.",
    "Added a separate /portfolio page for anyone who wants a clean, straightforward portfolio overview.",
  ],
};
