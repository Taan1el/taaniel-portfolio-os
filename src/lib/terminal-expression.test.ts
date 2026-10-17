import { describe, expect, it } from "vitest";
import {
  evaluateNode,
  interpolateString,
  MAX_EXPRESSION_DEPTH,
  MAX_EXPRESSION_STEPS,
  MAX_STRING_LENGTH,
  parseExpression,
  parseSizeLiteral,
  type ExpressionEnv,
  type ExpressionScope,
  type ShellValue,
} from "@/lib/terminal-expression";
import { createObject } from "@/lib/terminal-objects";

function makeEnv(variables: Record<string, ShellValue> = {}): ExpressionEnv {
  return { readVariable: (name) => variables[name.toLowerCase()], budget: { steps: 0 } };
}

/** Parse and evaluate; the error message when either step fails, undefined when it is not an expression. */
function calc(text: string, variables: Record<string, ShellValue> = {}, scope?: ExpressionScope, env = makeEnv(variables)) {
  const parsed = parseExpression(text);
  if (!parsed) return undefined;
  if ("error" in parsed) return `error: ${parsed.error}`;
  try {
    return evaluateNode(parsed.node, env, scope);
  } catch (error) {
    return `error: ${(error as Error).message}`;
  }
}

const file = (name: string, length: number) =>
  createObject("System.IO.FileInfo", { Name: name, Length: length, Extension: name.slice(name.lastIndexOf(".")) }, name);

describe("expression precedence", () => {
  it.each([
    ["2 + 3 * 4", 14],
    ["(2 + 3) * 4", 20],
    ["10 / 4", 2.5],
    ["-5 + 2", -3],
    ["1kb", 1024],
  ])("%s = %s", (text, expected) => {
    expect(calc(text)).toBe(expected);
  });

  it("compares before it combines with -and / -or", () => {
    expect(calc("1 -eq 1 -and 2 -eq 2")).toBe(true);
    expect(calc("1 -eq 2 -or 3 -gt 2")).toBe(true);
    expect(calc("5 -gt 3 -and 2 -lt 1")).toBe(false);
  });

  it("treats -not and ! as unary operators", () => {
    expect(calc("-not (1 -eq 2)")).toBe(true);
    expect(calc("!($x)", { x: true })).toBe(false);
    expect(calc("-not $x -eq $false", { x: false })).toBe(false);
  });

  it("uses PowerShell truthiness", () => {
    expect(calc("-not ''")).toBe(true);
    expect(calc("-not 0")).toBe(true);
    // The string "False" is a non-empty string, so it is true.
    expect(calc("-not 'False'")).toBe(false);
  });

  it("returns undefined for text that is not an expression", () => {
    expect(calc("Get-ChildItem")).toBeUndefined();
    expect(calc("(globalThis.pwned = 1)")).toBeUndefined();
    expect(calc("")).toBeUndefined();
  });

  it("reports parse errors with PowerShell's wording", () => {
    expect(calc("(1 + 2")).toBe("error: Missing closing ')' in expression.");
    expect(calc("5 -gt")).toBe("error: You must provide a value expression following the operator.");
    expect(calc("1 / 0")).toBe("error: Attempted to divide by zero.");
  });
});

describe("operators", () => {
  it("matches, likes and replaces", () => {
    expect(calc("'report.md' -like '*.md'")).toBe(true);
    expect(calc("'report.md' -notlike '*.md'")).toBe(false);
    expect(calc("'abc123' -match '\\d+'")).toBe(true);
    expect(calc("'report.md' -replace '\\.md$','.txt'")).toBe("report.txt");
    expect(calc("'a-b-c' -split '-'")).toEqual(["a", "b", "c"]);
    expect(calc("'a','b','c' -join '+'")).toBe("a+b+c");
  });

  it("tests membership in arrays", () => {
    expect(calc("'a','b' -contains 'B'")).toBe(true);
    expect(calc("'.md' -in '.md','.txt'")).toBe(true);
    expect(calc("'.js' -notin '.md','.txt'")).toBe(true);
  });

  it("rejects an invalid regular expression", () => {
    expect(calc("'x' -match '('")).toContain("is not valid");
    expect(calc("'x' -replace '('")).toContain("is not valid");
  });
});

describe("variables and members", () => {
  it("reads .Length and .Count of session values", () => {
    expect(calc("$name.Length", { name: "Taaniel" })).toBe(7);
    expect(calc("$list.Count", { list: ["a", "b", "c"] })).toBe(3);
  });

  it("binds $_ and $PSItem to the pipeline item inside a script block", () => {
    const scope = { item: file("notes.md", 2048) };
    expect(calc("$_.Length -gt 1kb", {}, scope)).toBe(true);
    expect(calc("$PSItem.Name", {}, scope)).toBe("notes.md");
    expect(calc("$_.Name -like '*.md' -and $_.Length -lt 1kb", {}, scope)).toBe(false);
    expect(calc("$_.Missing", {}, scope)).toBe("");
  });

  it("treats a bare string item as its own value", () => {
    expect(calc("$_ -like 'a*'", {}, { item: "alpha" })).toBe(true);
    expect(calc("$_.Length", {}, { item: "alpha" })).toBe(5);
  });
});

describe("interpolation", () => {
  it("expands variables, $_ and $( subexpressions )", () => {
    const env = makeEnv({ name: "Taaniel" });
    expect(interpolateString("Hi $name", env)).toBe("Hi Taaniel");
    expect(interpolateString("2 + 2 = $(2 + 2)", env)).toBe("2 + 2 = 4");
    expect(interpolateString("$($_.Name) is $($_.Length) bytes", env, { item: file("a.txt", 12) })).toBe("a.txt is 12 bytes");
    expect(interpolateString("item: $_", env, { item: "x" })).toBe("item: x");
  });

  it("leaves a subexpression that is not an expression as typed", () => {
    expect(interpolateString("now: $(Get-Date)", makeEnv())).toBe("now: $(Get-Date)");
    expect(interpolateString("open $(1 + 1", makeEnv())).toBe("open $(1 + 1");
  });

  it("throws for a failing subexpression", () => {
    expect(() => interpolateString("$(1 / 0)", makeEnv())).toThrow("divide by zero");
  });
});

describe("hard limits", () => {
  it("refuses to build a huge string", () => {
    expect(calc("'a' * 2000000")).toContain("too long");
    expect(calc(`'${"a".repeat(1000)}' * ${Math.ceil(MAX_STRING_LENGTH / 1000) + 1}`)).toContain("too long");
    expect(calc("'ab' * 3")).toBe("ababab");
  });

  it("refuses expressions nested past the depth limit", () => {
    const deep = `${"(".repeat(MAX_EXPRESSION_DEPTH + 5)}1${")".repeat(MAX_EXPRESSION_DEPTH + 5)}`;
    expect(calc(deep)).toContain("nested too deeply");
    const unary = `${"-".repeat(MAX_EXPRESSION_DEPTH + 5)}1`;
    expect(calc(unary)).toContain("nested too deeply");
    expect(calc("((((1))))")).toBe(1);
  });

  it("stops once the work budget is spent", () => {
    const env = makeEnv();
    env.budget.steps = MAX_EXPRESSION_STEPS;
    expect(calc("1 + 1", {}, undefined, env)).toContain("took too long");
  });

  it("caps arrays", () => {
    const text = Array.from({ length: 3 }, () => "'x'").join(",");
    expect(calc(text)).toEqual(["x", "x", "x"]);
  });
});

describe("size literals", () => {
  it("reads kb, mb, gb and tb", () => {
    expect(parseSizeLiteral("1kb")).toBe(1024);
    expect(parseSizeLiteral("2.5MB")).toBe(2.5 * 1024 ** 2);
    expect(parseSizeLiteral("12")).toBeNull();
    expect(parseSizeLiteral("kb")).toBeNull();
  });
});
