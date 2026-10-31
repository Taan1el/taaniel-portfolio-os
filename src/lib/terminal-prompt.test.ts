import { describe, expect, it } from "vitest";
import {
  expandPromptTemplate,
  MAX_PROMPT_LENGTH,
  MAX_PROMPT_LINES,
  MAX_PROMPT_TEMPLATE_LENGTH,
  sanitizePromptTemplate,
  splitPrompt,
  type PromptContext,
} from "@/lib/terminal-prompt";

const context: PromptContext = {
  path: "C:\\Users\\Taaniel\\Desktop",
  date: "Fri 17/10/2026",
  time: "09:05:30.12",
  version: "Taaniel OS [Version 11.0.1]",
};
const expand = (template: string) => expandPromptTemplate(template, context);

describe("expandPromptTemplate", () => {
  it("expands the default $P$G to the folder and a >", () => {
    expect(expand("$P$G")).toBe("C:\\Users\\Taaniel\\Desktop>");
  });

  it("expands the common codes", () => {
    expect(expand("$N:$S$P$S$G$S")).toBe("C: C:\\Users\\Taaniel\\Desktop > ");
    expect(expand("$D $T")).toBe("Fri 17/10/2026 09:05:30.12");
    expect(expand("$V")).toBe("Taaniel OS [Version 11.0.1]");
    expect(expand("$L$P$G")).toBe("<C:\\Users\\Taaniel\\Desktop>");
    expect(expand("$A$B$C$F$Q")).toBe("&|()=");
    expect(expand("cost: $$5")).toBe("cost: $5");
  });

  it("reads codes without regard to case, and a $ at the end alone", () => {
    expect(expand("$p$g")).toBe("C:\\Users\\Taaniel\\Desktop>");
    expect(expand("$")).toBe("");
  });

  it("starts a new line with $_", () => {
    expect(expand("$P$_$G")).toBe("C:\\Users\\Taaniel\\Desktop\n>");
  });

  it("deletes the last character with $H", () => {
    expect(expand("abc$H$H$G")).toBe("a>");
    expect(expand("$H$G")).toBe(">");
  });

  it("drops a code it does not know, or cannot show", () => {
    expect(expand("a$Zb$+c$Md")).toBe("abcd");
  });

  it("keeps colour codes written with $E, and nothing else an escape could do", () => {
    expect(expand("$E[32m$P$E[0m$G")).toBe("\u001b[32mC:\\Users\\Taaniel\\Desktop\u001b[0m>");
    // Clear screen, cursor movement and an OSC title are not colours: the escape character goes.
    expect(expand("$E[2J$E[10;10H$E]0;pwned$G")).toBe("[2J[10;10H]0;pwned>");
  });

  it("turns colour off at the end so what is typed is not coloured", () => {
    expect(expand("$E[31m$G")).toBe("\u001b[31m>\u001b[0m");
  });

  it("strips control characters typed into the template", () => {
    expect(expand("a\u001b[2Jb\u0007c\u0000d")).toBe("a[2Jbcd");
  });

  it("cannot be made longer than the cap, or cut inside a colour code", () => {
    expect(expand("x".repeat(5000))).toHaveLength(MAX_PROMPT_TEMPLATE_LENGTH);
    // Path codes make the expansion longer than the template; the prompt is cut at its own cap.
    const long = expandPromptTemplate("$P".repeat(100), { ...context, path: "p".repeat(100) });
    expect(long.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);

    const cut = expandPromptTemplate(`${"x".repeat(MAX_PROMPT_LENGTH - 2)}$E[31;1;4m`, context);
    // eslint-disable-next-line no-control-regex
    expect(cut).not.toMatch(/\u001b\[[0-9;]*$/);
  });

  it("keeps to a few lines", () => {
    const lines = expand("a$_b$_c$_d$_e$_f").split("\n");
    expect(lines).toHaveLength(MAX_PROMPT_LINES);
    expect(lines.at(-1)).toBe("d e f");
  });
});

describe("sanitizePromptTemplate", () => {
  it("removes control characters and caps the length", () => {
    expect(sanitizePromptTemplate("$P\u001b$G\n")).toBe("$P$G");
    expect(sanitizePromptTemplate("y".repeat(1000))).toHaveLength(MAX_PROMPT_TEMPLATE_LENGTH);
  });
});

describe("splitPrompt", () => {
  it("splits at the last line", () => {
    expect(splitPrompt("C:\\>")).toEqual({ head: "", last: "C:\\>" });
    expect(splitPrompt("C:\\Users\n>")).toEqual({ head: "C:\\Users\n", last: ">" });
    expect(splitPrompt("a\nb\nc")).toEqual({ head: "a\nb\n", last: "c" });
    expect(splitPrompt("path\n")).toEqual({ head: "path\n", last: "" });
  });
});
