// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildSeedFileSystem } from "@/data/seedFileSystem";
import { refreshPortfolioWorkspace } from "./portfolio-workspace";

describe("portfolio workspace updates", () => {
  it("refreshes the unchanged previous About document", async () => {
    const seed = buildSeedFileSystem();
    const about = seed["/Portfolio/About.md"];
    if (about.kind !== "file") throw new Error("Missing About document");
    const content = [
      "# About Taaniel", "",
      "I ship responsive web UI and campaign designs. This portfolio is also a live code sample: a browser-based desktop built with React and TypeScript, with a window manager and a virtual filesystem you can browse.", "",
      "## Current context", "",
      "I design and ship marketing and campaign visuals in a team while building stronger frontend skills in React and TypeScript — this portfolio OS is the main proof of that.", "",
      "## Strengths", "",
      ...["React", "TypeScript", "JavaScript", "HTML / CSS", "Responsive UI", "Figma", "Email HTML", "Component architecture", "Zustand", "Vite"].map((skill) => "- " + skill), "",
      "## Availability", "",
      "Open to junior and mid-level frontend roles.", "",
    ].join("\n");
    const updated = await refreshPortfolioWorkspace({ ...seed, [about.path]: { ...about, content } });
    expect(updated[about.path]).toEqual(about);
  });
  it("adds current case studies without changing user notes", async () => {
    const seed = buildSeedFileSystem();
    const about = seed["/Portfolio/About.md"];
    if (about.kind !== "file") throw new Error("Missing About document");
    const edited = { ...about, content: "My own edited biography" };
    const updated = await refreshPortfolioWorkspace({ [about.path]: edited });
    expect(updated[about.path]).toBe(edited);
    expect(updated["/Portfolio/Case Studies/Slow Pour/Overview.md"]).toBeDefined();
  });

  it("removes retired bundled image references but preserves user-created files", async () => {
    const seed = buildSeedFileSystem();
    const photo = seed["/Portfolio/Case Studies/Slow Pour/Hero.png"];
    if (photo.kind !== "file") throw new Error("Missing screenshot");
    const retired = { ...photo, path: "/old.png", source: "/taaniel-portfolio-os/assets/Work/old.png", readonly: true };
    const custom = { ...retired, path: "/mine.png", readonly: false };
    const updated = await refreshPortfolioWorkspace({ ...seed, [retired.path]: retired, [custom.path]: custom });
    expect(updated[retired.path]).toBeUndefined();
    expect(updated[custom.path]).toBe(custom);
  });

  it("leaves current defaults unchanged", async () => {
    const seed = buildSeedFileSystem();
    // Original documents whose content did not change may be refreshed once.
    const refreshed = await refreshPortfolioWorkspace(seed);
    expect(await refreshPortfolioWorkspace(refreshed)).toEqual(refreshed);
  });
});
