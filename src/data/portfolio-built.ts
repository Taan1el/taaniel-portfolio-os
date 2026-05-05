/** Visible "proof" copy for recruiters — not buried in the virtual filesystem. */
export const portfolioBuilt = {
  headline: "How this portfolio is built",
  stack: ["React 19", "TypeScript", "Vite", "Zustand", "IndexedDB", "pdf.js", "Framer Motion", "react-rnd"],
  architectureSummary:
    "A React + TypeScript single-page app that works like a real desktop OS: draggable and resizable windows, a virtual filesystem that saves between sessions, and apps that load only when opened to keep the page fast.",
  decisions: [
    "Used Zustand for state management — keeps window and taskbar updates fast and predictable.",
    "Virtual filesystem backed by IndexedDB so files and layout changes survive a page refresh.",
    "Apps load only when opened (React.lazy) so the initial page loads quickly.",
    "Added a separate /simple page for anyone who wants a clean, straightforward portfolio overview.",
  ],
};
