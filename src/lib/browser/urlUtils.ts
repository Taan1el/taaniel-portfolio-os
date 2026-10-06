import { normalizePath } from "@/lib/filesystem";

export const DEFAULT_BROWSER_HOME = "https://www.google.com/webhp?igu=1";

/** Pages the browser draws itself, in React - never loaded into an iframe. */
export const NEW_TAB_URL = "browser://newtab";
export const HISTORY_URL = "browser://history";
const INTERNAL_PAGES = new Set([NEW_TAB_URL, HISTORY_URL]);

export function isInternalPage(url: string) {
  return INTERNAL_PAGES.has(url);
}

const SEARCH_QUERY_BASE = "https://www.google.com/search?igu=1&q=";
const SAFE_PROTOCOLS = new Set(["http:", "https:"]);
const ABSOLUTE_PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const HOSTNAME_PATTERN =
  /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i;
const GOOGLE_HOST_PATTERN = /(^|\.)google\./i;

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

export function normalizeEmbeddableBrowserUrl(inputUrl: string) {
  try {
    const url = new URL(inputUrl);

    if (GOOGLE_HOST_PATTERN.test(url.hostname)) {
      if (url.pathname === "/" || url.pathname === "") {
        url.pathname = "/webhp";
      }

      url.searchParams.set("igu", "1");
    }

    return url.toString();
  } catch {
    return inputUrl;
  }
}

export function getUrlOrSearch(input: string): string {
  const normalizedUrl = tryNormalizeHttpUrl(input);

  if (normalizedUrl) {
    return normalizeEmbeddableBrowserUrl(normalizedUrl);
  }

  return buildSearchUrl(input);
}

export function normalizeBrowserAddress(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  // Only the exact internal pages are allowed; any other browser:// text is searched for.
  if (isInternalPage(trimmed.toLowerCase())) {
    return trimmed.toLowerCase();
  }

  if (trimmed.startsWith("/")) {
    return normalizePath(trimmed);
  }

  return getUrlOrSearch(trimmed);
}

export function getBrowserTitleFromUrl(url: string) {
  if (url === NEW_TAB_URL) return "New tab";
  if (url === HISTORY_URL) return "History";
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "") || "Browser";
  } catch {
    return "Browser";
  }
}
