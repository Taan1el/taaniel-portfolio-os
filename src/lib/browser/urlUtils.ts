import { normalizePath } from "@/lib/filesystem";

export const DEFAULT_BROWSER_HOME = "https://duckduckgo.com/";

const SEARCH_QUERY_BASE = "https://duckduckgo.com/?q=";
const SAFE_PROTOCOLS = new Set(["http:", "https:"]);
const ABSOLUTE_PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const HOSTNAME_PATTERN =
  /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i;

function buildSearchUrl(query: string) {
  const trimmed = query.trim();

  if (!trimmed) {
    return DEFAULT_BROWSER_HOME;
  }

  return `${SEARCH_QUERY_BASE}${encodeURIComponent(trimmed)}`;
}

function tryNormalizeHttpUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();

  if (schemeMatch) {
    if (!SAFE_PROTOCOLS.has(`${schemeMatch}:`)) {
      return "";
    }

    try {
      return new URL(trimmed).toString();
    } catch {
      return "";
    }
  }

  if (trimmed.startsWith("//")) {
    try {
      return new URL(`https:${trimmed}`).toString();
    } catch {
      return "";
    }
  }

  if (HOSTNAME_PATTERN.test(trimmed)) {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      return "";
    }
  }

  if (ABSOLUTE_PROTOCOL_PATTERN.test(trimmed)) {
    return "";
  }

  return "";
}

export function getUrlOrSearch(input: string): string {
  const normalizedUrl = tryNormalizeHttpUrl(input);

  if (normalizedUrl) {
    return normalizedUrl;
  }

  return buildSearchUrl(input);
}

export function normalizeBrowserAddress(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    return normalizePath(trimmed);
  }

  return getUrlOrSearch(trimmed);
}

export function getBrowserTitleFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "") || "Browser";
  } catch {
    return "Browser";
  }
}
