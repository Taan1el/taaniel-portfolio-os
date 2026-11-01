// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(resolve(process.cwd(), "docs", name), "utf8");
const body = (html: string) => html.slice(html.indexOf("<body>"));
const links = (html: string) => [...body(html).matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
const numbers = (html: string) => body(html).replace(/<[^>]+>/g, " ").match(/\d[\d.,+–]*\d|\d/g) ?? [];

describe("the two CVs", () => {
  const estonian = read("cv.html");
  const english = read("cv.en.html");

  it("share every link", () => {
    expect(links(english)).toEqual(links(estonian));
  });

  it("share every date and number", () => {
    expect(numbers(english)).toEqual(numbers(estonian));
  });

  it("are both shipped as PDFs", () => {
    for (const name of ["CV_Taaniel_Vananurm.pdf", "CV_Taaniel_Vananurm_EN.pdf"]) {
      expect(existsSync(resolve(process.cwd(), "public/assets", name))).toBe(true);
    }
  });
});
