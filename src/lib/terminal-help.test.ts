import { describe, expect, it } from "vitest";
import { ABOUT_TOPICS, findAboutTopic, HELP_EXAMPLES, READLINE_KEY_HANDLERS, syntaxParameters } from "@/lib/terminal-help";

describe("syntaxParameters", () => {
  it("reads names, types and switches off a syntax line", () => {
    expect(syntaxParameters("Get-ChildItem [[-Path] <string>] [-Recurse] [-Depth <uint>] [-Filter <string>]")).toEqual([
      { name: "Path", type: "<string>" },
      { name: "Recurse", type: null },
      { name: "Depth", type: "<uint>" },
      { name: "Filter", type: "<string>" },
    ]);
  });

  it("does not take the dash inside a command name for a parameter", () => {
    const names = syntaxParameters("<command> | Select-Object [[-Property] <string[]>] [-ExpandProperty <string>]").map((entry) => entry.name);
    expect(names).toEqual(["Property", "ExpandProperty"]);
  });

  it("reads value sets such as File|Directory", () => {
    expect(syntaxParameters("New-Item [-Path] <string> [-ItemType File|Directory] [-Force]")).toEqual([
      { name: "Path", type: "<string>" },
      { name: "ItemType", type: "File|Directory" },
      { name: "Force", type: null },
    ]);
  });

  it("reads alternatives separated by a bar, and ignores a name given twice", () => {
    const names = syntaxParameters("<command> | Where-Object [-Property] <string> -GT|-EQ|-Like|-Match... <value>").map((entry) => entry.name);
    expect(names).toEqual(["Property", "GT", "EQ", "Like", "Match"]);
    expect(syntaxParameters("x [-Force] [-force]")).toHaveLength(1);
  });

  it("finds nothing in a syntax without parameters", () => {
    expect(syntaxParameters("Get-Location")).toEqual([]);
    expect(syntaxParameters("mkdir <path> [<path>...]")).toEqual([]);
  });
});

describe("help topics", () => {
  it("finds a topic whatever the case", () => {
    expect(findAboutTopic("ABOUT_pipelines")?.name).toBe("about_Pipelines");
    expect(findAboutTopic("about_Nothing")).toBeUndefined();
  });

  it("has unique names and text for every topic", () => {
    expect(new Set(ABOUT_TOPICS.map((topic) => topic.name.toLowerCase())).size).toBe(ABOUT_TOPICS.length);
    ABOUT_TOPICS.forEach((topic) => {
      expect(topic.name).toMatch(/^about_[A-Za-z_]+$/);
      expect(topic.synopsis.length).toBeGreaterThan(10);
      expect(topic.body.length).toBeGreaterThan(3);
    });
  });
});

describe("branding", () => {
  const BRAND = /microsoft|\bwindows\b/i;

  it("never names the Windows or Microsoft brand in any help text", () => {
    const text = JSON.stringify([ABOUT_TOPICS, HELP_EXAMPLES, READLINE_KEY_HANDLERS]);
    expect(text).not.toMatch(BRAND);
  });
});
