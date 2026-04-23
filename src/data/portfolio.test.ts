import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { themePresets } from "@/data/portfolio";

const PUBLIC_DIR = resolve(process.cwd(), "public");

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
