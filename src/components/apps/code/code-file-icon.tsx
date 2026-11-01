import { Atom, File, Settings } from "lucide-react";

const BLUE = "#519aba";
const YELLOW = "#cbcb41";
const ORANGE = "#e37933";
const PURPLE = "#a074c4";

const BADGES: Record<string, { text: string; color: string }> = {
  ts: { text: "TS", color: BLUE },
  js: { text: "JS", color: YELLOW },
  mjs: { text: "JS", color: YELLOW },
  cjs: { text: "JS", color: YELLOW },
  css: { text: "#", color: BLUE },
  json: { text: "{}", color: YELLOW },
  md: { text: "M", color: BLUE },
  html: { text: "<>", color: ORANGE },
  htm: { text: "<>", color: ORANGE },
  py: { text: "PY", color: BLUE },
  sh: { text: "$", color: "#89e051" },
  ps1: { text: ">_", color: BLUE },
};

/** The small coloured file marks an editor's tree uses. Tests take the warmer colour so they stand out from code. */
export function CodeFileIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  const extension = lower.slice(lower.lastIndexOf(".") + 1);
  const test = /\.(test|spec)\.[a-z]+$/.test(lower);

  if (extension === "tsx" || extension === "jsx") {
    return <Atom className="code-app__icon" size={15} color={test ? ORANGE : BLUE} aria-hidden="true" />;
  }
  if (extension === "yml" || extension === "yaml") {
    return <Settings className="code-app__icon" size={15} color={PURPLE} aria-hidden="true" />;
  }

  const badge = BADGES[extension];
  if (!badge) return <File className="code-app__icon" size={15} color="#9d9d9d" aria-hidden="true" />;

  return (
    <span className="code-app__icon code-app__badge" style={{ color: test ? ORANGE : badge.color }} aria-hidden="true">
      {badge.text}
    </span>
  );
}
