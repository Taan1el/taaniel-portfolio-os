import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getAppDefinition, getAppRegistry } from "./app-registry";
import { originalGameIds } from "./games";
import { ensureSystemWorkspace } from "./system-workspace";
import { buildShellSearchIndex, queryShellSearch } from "./shell-search";
import { launchFileSystemPath } from "./launchers";

describe("Next Stop discovery and bundling", () => {
  it("appears in Games, Start and railway search", () => {
    expect(originalGameIds).toContain("next-stop");
    expect(getAppRegistry().map((app) => app.id)).toEqual(expect.arrayContaining(["games", "next-stop"]));
    expect(getAppDefinition("next-stop").multiple).not.toBe(true);
    const index = buildShellSearchIndex(ensureSystemWorkspace({}));
    for (const term of ["Next Stop", "steam train", "railway"]) {
      expect(queryShellSearch(index, term).flatMap((section) => section.results).some((item) => item.action.type === "launch-app" && item.action.appId === "next-stop")).toBe(true);
    }
  });
  it("adds a working Games shortcut while retaining visitor files", () => {
    const custom = { kind: "file" as const, path: "/Games/my-notes.txt", name: "my-notes.txt", extension: "txt", mimeType: "text/plain", content: "mine", createdAt: 1, updatedAt: 1 };
    const nodes = ensureSystemWorkspace({ [custom.path]: custom });
    expect(nodes[custom.path]).toBe(custom);
    const launches: unknown[] = [];
    launchFileSystemPath("/Games/Next Stop.lnk", nodes, (options) => { launches.push(options); return "window-game"; });
    expect(launches).toEqual([{ appId: "next-stop" }]);
    expect(ensureSystemWorkspace(nodes)).toBe(nodes);
  });
  it("ships the exact reviewed offline HTML and its MIT notice", () => {
    const bytes = readFileSync("public/assets/games/next-stop/next-stop.html");
    expect(bytes.length).toBeLessThan(2_000_000);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("03cec70a0de995eb25ba95daa661ff3e65aec3ccca10b586a76c6540a40a832d");
    expect(bytes.toString()).toContain(readFileSync("public/assets/games/next-stop/LICENSE", "utf8").trim());
    expect(bytes.toString()).toContain("connect-src 'none'");
  });
});
