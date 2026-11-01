import { beforeEach, describe, expect, it } from "vitest";
import {
  PROJECT_ROOT,
  applyProjectEdit,
  buildProjectNodes,
  discardProjectEdit,
  isSafeProjectPath,
  projectChanges,
  readProjectEdits,
  sanitizeProject,
  writeProjectEdits,
} from "@/lib/code-project";

const source = { branch: "main", commit: "abc", files: { "src/app/App.tsx": "app", "README.md": "readme" }, listed: ["public/logo.png"] };

describe("project paths", () => {
  it("accepts paths inside the project", () => {
    expect(isSafeProjectPath("src/app/App.tsx")).toBe(true);
    expect(isSafeProjectPath(".github/workflows/deploy-pages.yml")).toBe(true);
  });

  it("refuses anything that could climb out or is not a plain path", () => {
    for (const path of ["", "/etc/passwd", "../secret", "src/../../x", "src//a", "a\\b", "a\nb", "__proto__/x", 7, null]) {
      expect(isSafeProjectPath(path)).toBe(false);
    }
  });
});

describe("project file", () => {
  it("keeps good files and drops bad ones", () => {
    const project = sanitizeProject({ branch: "main", commit: "abc", files: { "a.ts": "ok", "../b.ts": "no", "c.ts": 5 } });
    expect(Object.keys(project?.files ?? {})).toEqual(["a.ts"]);
  });

  it("keeps listed paths only when they are safe", () => {
    const project = sanitizeProject({ files: { "a.ts": "ok" }, listed: ["public/a.png", "../b.png", 4] });
    expect(project?.listed).toEqual(["public/a.png"]);
  });

  it("treats a broken file as no project", () => {
    expect(sanitizeProject(null)).toBeNull();
    expect(sanitizeProject({ files: [] })).toBeNull();
    expect(sanitizeProject({ files: {} })).toBeNull();
  });
});

describe("project nodes", () => {
  it("builds folders down to each file", () => {
    const nodes = buildProjectNodes(source, {});
    expect(nodes[PROJECT_ROOT]?.kind).toBe("directory");
    expect(nodes[`${PROJECT_ROOT}/src`]?.kind).toBe("directory");
    expect(nodes[`${PROJECT_ROOT}/src/app`]?.kind).toBe("directory");
    expect(nodes[`${PROJECT_ROOT}/src/app/App.tsx`]).toMatchObject({ kind: "file", name: "App.tsx", extension: "tsx", content: "app" });
  });

  it("shows listed files in the tree as read-only", () => {
    const nodes = buildProjectNodes(source, {});
    expect(nodes[`${PROJECT_ROOT}/public`]?.kind).toBe("directory");
    expect(nodes[`${PROJECT_ROOT}/public/logo.png`]).toMatchObject({ kind: "file", readonly: true });
    expect(nodes[`${PROJECT_ROOT}/README.md`]).toMatchObject({ readonly: false });
  });

  it("lays saved edits and new files over the source", () => {
    const nodes = buildProjectNodes(source, { "README.md": "changed", "notes/new.md": "" });
    expect(nodes[`${PROJECT_ROOT}/README.md`]).toMatchObject({ content: "changed" });
    expect(nodes[`${PROJECT_ROOT}/notes/new.md`]).toMatchObject({ content: "" });
    expect(nodes[`${PROJECT_ROOT}/notes`]?.kind).toBe("directory");
  });

  it("is empty until the project has loaded", () => {
    expect(buildProjectNodes(null, {})).toEqual({});
  });
});

describe("project edits", () => {
  it("lists changed and new files", () => {
    expect(projectChanges(source, { "README.md": "x", "b.ts": "y" })).toEqual([
      { path: `${PROJECT_ROOT}/b.ts`, name: "b.ts", status: "U" },
      { path: `${PROJECT_ROOT}/README.md`, name: "README.md", status: "M" },
    ]);
  });

  it("clears an edit that matches the source again", () => {
    const edited = applyProjectEdit(source, {}, "README.md", "x");
    expect(Object.keys(edited)).toEqual(["README.md"]);
    expect(Object.keys(applyProjectEdit(source, edited, "README.md", "readme"))).toEqual([]);
  });

  it("keeps an empty new file", () => {
    expect(applyProjectEdit(source, {}, "new.ts", "")["new.ts"]).toBe("");
  });

  it("discards one edit and leaves the rest", () => {
    expect(Object.keys(discardProjectEdit({ "a.ts": "1", "b.ts": "2" }, "a.ts"))).toEqual(["b.ts"]);
  });
});

describe("saved edits", () => {
  beforeEach(() => localStorage.clear());

  it("come back after a reload", () => {
    writeProjectEdits({ "a.ts": "text" });
    expect({ ...readProjectEdits() }).toEqual({ "a.ts": "text" });
  });

  it("ignore tampered entries and broken storage", () => {
    localStorage.setItem("taaniel-os-code-project-edits", JSON.stringify({ "../x": "no", "a.ts": 1, "b.ts": "ok" }));
    expect({ ...readProjectEdits() }).toEqual({ "b.ts": "ok" });
    localStorage.setItem("taaniel-os-code-project-edits", "{nope");
    expect({ ...readProjectEdits() }).toEqual({});
  });

  it("clear the key when nothing is left", () => {
    writeProjectEdits({ "a.ts": "text" });
    writeProjectEdits({});
    expect(localStorage.getItem("taaniel-os-code-project-edits")).toBeNull();
  });
});
