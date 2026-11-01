import { describe, expect, it } from "vitest";
import { hasReadableText } from "./build-project-source.mjs";

describe("project source files", () => {
  it("reads source, docs and text in public", () => {
    expect(hasReadableText("src/app/App.tsx")).toBe(true);
    expect(hasReadableText("README.md")).toBe(true);
    expect(hasReadableText(".github/workflows/deploy-pages.yml")).toBe(true);
    expect(hasReadableText("public/assets/v86/README.txt")).toBe(true);
  });

  it("only lists binaries and the lockfile", () => {
    expect(hasReadableText("public/assets/v86/linux.iso")).toBe(false);
    expect(hasReadableText("docs/images/code.png")).toBe(false);
    expect(hasReadableText("package-lock.json")).toBe(false);
  });
});
