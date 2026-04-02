import createDOMPurify from "dompurify";

let purifier: ReturnType<typeof createDOMPurify> | null = null;

function getPurifier() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!purifier) {
    purifier = createDOMPurify(window);
  }

  return purifier;
}

export function sanitizeHTML(input: string): string {
  if (!input) {
    return "";
  }

  const activePurifier = getPurifier();

  if (!activePurifier) {
    return input;
  }

  return activePurifier.sanitize(input, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style"],
  });
}
