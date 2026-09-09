import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { featuredProjects, profile, resumePdfPath, themePresets } from "@/data/portfolio";
import { buildSeedFileSystem } from "@/data/seedFileSystem";

const PUBLIC_DIR = resolve(process.cwd(), "public");

describe("public portfolio", () => {
  it("has real project images, source links, and a CV", () => {
    for (const project of featuredProjects) {
      expect(existsSync(resolve(PUBLIC_DIR, project.hero.replace(/^\/+/, "")))).toBe(true);
      expect(project.heroAlt).toBeTruthy();
      expect(project.repoUrl).toMatch(/^https:\/\/github.com\/Taan1el\//);
      expect(project.liveUrl).toMatch(/^https:\/\//);
      expect(project.problem && project.role && project.outcome).toBeTruthy();
    }
    expect(existsSync(resolve(PUBLIC_DIR, resumePdfPath.replace(/^\/+/, "")))).toBe(true);
  });

  it("uses completed education and internship dates without seniority inflation", () => {
    expect(profile.availability).toBe("Seeking junior frontend, web design and digital design roles.");
    expect(profile.education).toContain("Graduated with honours");
    expect(profile.current).toContain("19 June 2026");
    expect(JSON.stringify(profile)).not.toMatch(/mid-level|praeguseni/);
  });

  it("does not publish campaign assets or seed their URLs", () => {
    expect(existsSync(resolve(PUBLIC_DIR, "assets/Work"))).toBe(false);
    expect(JSON.stringify(buildSeedFileSystem())).not.toContain("assets/Work/");
  });

  it("explains the static demo and separate server", () => {
    const project = featuredProjects.find((item) => item.id === "slow-pour")!;
    expect(project.outcome).toContain("simulate");
    expect(project.challengesAndTradeoffs).toContain("do not run on GitHub Pages");
  });
});

describe("themePresets", () => {
  it("only references wallpaper image assets that exist in public", () => {
    const missingFiles = themePresets
      .flatMap((preset) => {
        const matches = [...preset.wallpaper.matchAll(/url\('([^']+)'\)/g)];
        return matches.map(([, assetPath]) => ({ presetId: preset.id, assetPath }));
      })
      .filter(({ assetPath }) => {
        const relativePath = assetPath.replace(/^\/+/, "");
        return !existsSync(resolve(PUBLIC_DIR, relativePath));
      });

    expect(missingFiles).toEqual([]);
  });
});
