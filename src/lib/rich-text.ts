import createDOMPurify from "dompurify";

const ALLOWED_TAGS = ["p", "div", "br", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "b", "strong", "i", "em", "u", "s", "strike", "a"];
const ALIGNMENT = /text-align:\s*(left|center|right|justify)/i;

/**
 * Keeps formatting and nothing else. A document or a paste is untrusted, so scripts, event
 * handlers, styles other than alignment, and links that are not web or mail are all removed.
 */
export function sanitizeRichText(input: string) {
  if (!input) return "";

  const purifier = createDOMPurify(window);
  const fragment = purifier.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "style"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
    RETURN_DOM_FRAGMENT: true,
  });

  fragment.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
    const align = ALIGNMENT.exec(element.getAttribute("style") ?? "");
    element.removeAttribute("style");
    if (align) element.style.textAlign = align[1].toLowerCase();
  });
  fragment.querySelectorAll("a").forEach((link) => {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });

  const holder = document.createElement("div");
  holder.append(fragment);
  return holder.innerHTML;
}

export function countWords(text: string) {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] as string);

/** A whole page, for exporting and printing. */
export function documentPage(title: string, html: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 20mm; }
body { max-width: 720px; margin: 0 auto; padding: 16px; color: #1f2328; font: 12pt/1.5 Georgia, "Times New Roman", serif; }
h1, h2, h3 { font-family: Arial, sans-serif; line-height: 1.25; }
blockquote { margin-left: 0; padding-left: 12px; border-left: 3px solid #c3cbca; color: #454a4c; }
</style>
</head>
<body>
${sanitizeRichText(html)}
</body>
</html>
`;
}
