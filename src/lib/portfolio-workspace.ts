import { buildSeedFileSystem } from "@/data/seedFileSystem";
import type { FileSystemRecord } from "@/types/system";

// Fingerprints of unchanged shipped documents, not user-authored notes.
const previousDocuments: Record<string, string> = {
  "/Portfolio/About.md": "a78665400474a3cfa730d635977ac20c054d5cecad352a69be9362dac8ad5917",
  "/Portfolio/Contact.md": "4312888197a3f21ffd6a718f0b0a16f47f8652236fe5ec5eef1da3f0c4cf4731",
  "/Portfolio/OS-Case-Study.md": "ecb7684d5ebd72015c7abb1d21552eb08247a825858ec76158cbb875a3fa5f29",
  "/Portfolio/Apps.md": "ce2ac94db35a29a0a420b58d896cca865f4561ac751ef47f252e351298e1a6da",
  "/Portfolio/Case Studies/Fintech Email Campaign (0% Offer)/Overview.md": "e771883725dc72afb4e90fc7400daefe6bf747105a3153dd52d72f030112cce5",
  "/Portfolio/Case Studies/Fast-Loan Hero + Template/Overview.md": "517c2589d4ced612cf4f5d2783d86a7355108e5092dd5a63637d7cfe3afc8a16",
  "/Portfolio/Case Studies/Mascot-Driven Email Campaign/Overview.md": "82343b3cc3b2945bfddf043c2d825555c460f128e285190ecceb87a1b7ba7a5f",
};

export async function refreshPortfolioWorkspace(nodes: FileSystemRecord): Promise<FileSystemRecord> {
  const defaults = buildSeedFileSystem();
  const next = { ...nodes };
  let changed = false;

  for (const [path, node] of Object.entries(next)) {
    if (node.kind !== "file") continue;
    if (node.readonly && node.source?.includes("/assets/Work/")) {
      delete next[path];
      changed = true;
      continue;
    }
    if (!previousDocuments[path] || !node.content || !globalThis.crypto?.subtle) continue;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(node.content));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hash !== previousDocuments[path]) continue;
    const replacement = defaults[path] ?? {
      ...node,
      content: "# Campaign work\n\nThis material is no longer included in the public portfolio. See the Fiizy internship summary on the portfolio page.",
    };
    if (JSON.stringify(replacement) !== JSON.stringify(node)) {
      next[path] = replacement;
      changed = true;
    }
  }

  // Add new case studies for returning visitors without resetting their filesystem.
  for (const [path, node] of Object.entries(defaults)) {
    if ((path === "/Portfolio" || path.startsWith("/Portfolio/")) && !next[path]) {
      next[path] = node;
      changed = true;
    }
  }
  return changed ? next : nodes;
}
