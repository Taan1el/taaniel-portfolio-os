import { describe, expect, it } from "vitest";
import { validateFileName } from "@/lib/file-names";

describe("validateFileName", () => {
  it("accepts ordinary names, with spaces and extensions", () => {
    expect(validateFileName("notes.txt")).toBeNull();
    expect(validateFileName("Summer 2026 (final).md")).toBeNull();
    expect(validateFileName(".gitignore")).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(validateFileName("")).toMatch(/must type a file name/);
    expect(validateFileName("   ")).toMatch(/must type a file name/);
  });

  it("rejects the characters Windows forbids", () => {
    ['a\\b', "a/b", "a:b", "a*b", "a?b", 'a"b', "a<b", "a>b", "a|b"].forEach((name) => {
      expect(validateFileName(name)).toMatch(/can't contain any of the following characters/);
    });
  });

  it("rejects names ending in a period and reserved device names", () => {
    expect(validateFileName("notes.")).toMatch(/period/);
    expect(validateFileName("..")).toMatch(/period/);
    expect(validateFileName("CON")).toMatch(/reserved/);
    expect(validateFileName("nul.txt")).toMatch(/reserved/);
    expect(validateFileName("console.txt")).toBeNull();
  });
});
