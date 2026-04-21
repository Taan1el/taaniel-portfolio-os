import type { ProxyMode } from "@/lib/browser/proxy";

export type BrowserHostDisposition = "direct" | "blocked" | "unknown";

export interface BrowserHostRule {
  disposition: BrowserHostDisposition;
  note?: string;
  message?: string;
  details?: string;
  retryProxyMode?: ProxyMode | null;
}

interface BrowserHostMatcherRule {
  disposition: Exclude<BrowserHostDisposition, "unknown">;
  note?: string;
  message?: string;
  details?: string;
  retryProxyMode?: ProxyMode | null;
  test: (url: URL) => boolean;
}

const DIRECT_HOST_RULES: BrowserHostMatcherRule[] = [
  {
    disposition: "direct",
    note: "Local and GitHub Pages sites usually render directly inside the Browser window.",
    test: (url) =>
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".github.io"),
  },
  {
    disposition: "direct",
    note: "Google pages using igu=1 are routed through the iframe-friendly variant.",
    test: (url) => /(^|\.)google\./i.test(url.hostname) && url.searchParams.get("igu") === "1",
  },
  {
    disposition: "direct",
    note: "Wikipedia is a reliable direct target for the Browser viewer.",
    test: (url) => /(^|\.)wikipedia\.org$/i.test(url.hostname),
  },
  {
    disposition: "direct",
    note: "Internet Archive pages are generally safe to try in direct mode.",
    test: (url) => /(^|\.)archive\.org$/i.test(url.hostname),
  },
];

const BLOCKED_HOST_RULES: BrowserHostMatcherRule[] = [
  {
    disposition: "blocked",
    message: "GitHub cannot be embedded directly in this Browser window",
    details: "GitHub sends frame protections, so the Browser switches straight to fallback instead of waiting on a blank iframe.",
    retryProxyMode: "allorigins",
    test: (url) => /(^|\.)github\.com$/i.test(url.hostname),
  },
  {
    disposition: "blocked",
    message: "This social or auth-heavy site is known to block iframe embedding",
    details: "Open it in a new tab for the real experience, or try a proxy preview if you only need a lightweight read-only view.",
    retryProxyMode: "allorigins",
    test: (url) =>
      [
        "linkedin.com",
        "instagram.com",
        "facebook.com",
        "x.com",
        "twitter.com",
        "tiktok.com",
        "discord.com",
      ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)),
  },
  {
    disposition: "blocked",
    message: "This streaming platform does not embed cleanly inside the Browser window",
    details: "Video platforms typically require full browser privileges or special embeds. The Browser shows fallback immediately to avoid a dead panel.",
    retryProxyMode: "allorigins",
    test: (url) =>
      [
        "youtube.com",
        "youtu.be",
        "twitch.tv",
        "open.spotify.com",
      ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)),
  },
  {
    disposition: "blocked",
    message: "This Google workspace page is not a reliable iframe target",
    details: "Workspace surfaces such as Docs and Drive use frame restrictions and auth flows that do not behave like simple web pages.",
    retryProxyMode: "allorigins",
    test: (url) =>
      ["docs.google.com", "drive.google.com"].some(
        (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
      ),
  },
];

export function getBrowserHostRule(inputUrl: string): BrowserHostRule {
  try {
    const url = new URL(inputUrl);
    const directMatch = DIRECT_HOST_RULES.find((rule) => rule.test(url));

    if (directMatch) {
      return directMatch;
    }

    const blockedMatch = BLOCKED_HOST_RULES.find((rule) => rule.test(url));

    if (blockedMatch) {
      return blockedMatch;
    }
  } catch {
    // Ignore invalid urls. Browser address normalization handles those separately.
  }

  return {
    disposition: "unknown",
  };
}

export function isLikelyEmbeddable(url: string) {
  return getBrowserHostRule(url).disposition !== "blocked";
}
