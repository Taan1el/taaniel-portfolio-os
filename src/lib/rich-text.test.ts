// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { countWords, documentPage, sanitizeRichText } from "@/lib/rich-text";

describe("rich text cleaning", () => {
  it("keeps formatting", () => {
    const html = "<h1>Title</h1><p><b>bold</b> <i>it</i> <u>un</u></p><ul><li>one</li></ul><blockquote>q</blockquote>";

    expect(sanitizeRichText(html)).toBe(html);
  });

  it.each([
    ['<img src=x onerror="alert(1)">', ""],
    ["<script>alert(1)</script>", ""],
    ['<svg onload="alert(1)"></svg>', ""],
    ["<iframe src='https://evil.example'></iframe>", ""],
    ['<p onclick="alert(1)">hi</p>', "<p>hi</p>"],
    ["<style>body{display:none}</style>", ""],
    ['<form action="https://evil.example"><input name="pw"></form>', ""],
  ])("removes %s", (html, expected) => {
    expect(sanitizeRichText(html)).toBe(expected);
  });

  it("keeps web and mail links, opened safely", () => {
    const html = sanitizeRichText('<a href="https://example.com">x</a>');

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(sanitizeRichText('<a href="mailto:a@b.c">x</a>')).toContain("mailto:a@b.c");
  });

  it.each(["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "file:///etc/passwd"])("drops a %s link", (href) => {
    expect(sanitizeRichText(`<a href="${href}">x</a>`)).not.toContain("href");
  });

  it("keeps alignment and no other style", () => {
    expect(sanitizeRichText('<p style="text-align: center; color: red; background: url(https://evil.example/x)">x</p>')).toBe('<p style="text-align: center;">x</p>');
    expect(sanitizeRichText('<p style="position:fixed;inset:0">x</p>')).toBe("<p>x</p>");
  });

  it("is safe with nothing", () => {
    expect(sanitizeRichText("")).toBe("");
  });
});

describe("word count", () => {
  it("counts", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  one\ntwo   three ")).toBe(3);
  });
});

describe("exported pages", () => {
  it("escapes the title and cleans the body", () => {
    const page = documentPage('</title><script>alert(1)</script>', "<p>ok</p><script>alert(2)</script>");

    expect(page).not.toContain("<script>");
    expect(page).toContain("<p>ok</p>");
    expect(page).toContain("&lt;/title&gt;");
  });
});
