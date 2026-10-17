import { describe, expect, it } from "vitest";
import { isAbsolutePath, joinPath, splitPath } from "@/lib/terminal-paths";

describe("joinPath", () => {
  it("joins with one backslash, whatever slashes were typed", () => {
    expect(joinPath("C:\\Users\\Taaniel", "Documents")).toBe("C:\\Users\\Taaniel\\Documents");
    expect(joinPath("C:\\Users\\Taaniel\\", "\\Documents")).toBe("C:\\Users\\Taaniel\\Documents");
    expect(joinPath("C:/Users/Taaniel", "Documents/CV.pdf")).toBe("C:\\Users\\Taaniel\\Documents\\CV.pdf");
    expect(joinPath("a", "b")).toBe("a\\b");
  });

  it("joins several children and drive roots", () => {
    expect(joinPath("C:\\", "Users", "Taaniel", "x.txt")).toBe("C:\\Users\\Taaniel\\x.txt");
    expect(joinPath("\\", "x")).toBe("\\x");
  });

  it("keeps a trailing separator for an empty child", () => {
    expect(joinPath("C:\\a", "")).toBe("C:\\a\\");
  });
});

describe("splitPath", () => {
  const file = "C:\\Users\\Taaniel\\Documents\\CV.final.pdf";

  it("gives the parent, leaf, base name and extension", () => {
    expect(splitPath(file, "parent")).toBe("C:\\Users\\Taaniel\\Documents");
    expect(splitPath(file, "leaf")).toBe("CV.final.pdf");
    expect(splitPath(file, "leafbase")).toBe("CV.final");
    expect(splitPath(file, "extension")).toBe(".pdf");
  });

  it("reads forward slashes and a trailing separator", () => {
    expect(splitPath("C:/Users/Taaniel/", "leaf")).toBe("Taaniel");
    expect(splitPath("C:/Users/Taaniel/", "parent")).toBe("C:\\Users");
  });

  it("knows about the drive", () => {
    expect(splitPath(file, "qualifier")).toBe("C:");
    expect(splitPath(file, "noqualifier")).toBe("\\Users\\Taaniel\\Documents\\CV.final.pdf");
    expect(splitPath("Documents\\x", "qualifier")).toBeNull();
  });

  it("handles roots and bare names", () => {
    expect(splitPath("C:\\Users", "parent")).toBe("C:\\");
    expect(splitPath("C:\\", "parent")).toBe("");
    expect(splitPath("C:\\", "leaf")).toBe("");
    expect(splitPath("name.txt", "parent")).toBe("");
    expect(splitPath("name.txt", "leaf")).toBe("name.txt");
    expect(splitPath("\\name", "parent")).toBe("\\");
    expect(splitPath(".hidden", "extension")).toBe("");
  });

  it("tells absolute paths from relative ones", () => {
    expect(isAbsolutePath("C:\\Users")).toBe(true);
    expect(isAbsolutePath("c:/x")).toBe(true);
    expect(isAbsolutePath("\\Users")).toBe(false);
    expect(isAbsolutePath("Documents")).toBe(false);
    expect(isAbsolutePath("~")).toBe(false);
  });
});
