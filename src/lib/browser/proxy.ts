export type ProxyMode = "direct" | "allorigins" | "wayback";

type ProxyTransformer = (url: string) => string;

export interface BrowserProxyStrategy {
  kind: "direct" | "proxy";
  label: string;
  note: string;
  transform: ProxyTransformer;
}

export const proxyStrategies: Record<ProxyMode, BrowserProxyStrategy> = {
  direct: {
    kind: "direct",
    label: "Direct",
    note:
      "Direct iframe mode. Google iframe pages, Wikipedia, and some static sites work here. Sites that block framing still need a proxy or a new tab.",
    transform: (url) => url,
  },
  allorigins: {
    kind: "proxy",
    label: "AllOrigins",
    note:
      "Public proxy preview through AllOrigins. When the service is degraded it can show its own timeout page — reload or switch to Wayback if that happens.",
    transform: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  wayback: {
    kind: "proxy",
    label: "Wayback",
    note:
      "Loads the latest web.archive.org snapshot in a frame-friendly view. Archived pages may differ from the current live site.",
    // "2" redirects to the newest snapshot; the "if_" flag strips the archive
    // toolbar and frame restrictions so the page renders inside the iframe.
    transform: (url) => `https://web.archive.org/web/2if_/${encodeURI(url)}`,
  },
};

export const proxyModes = Object.keys(proxyStrategies) as ProxyMode[];

export const proxyModeLabels: Record<ProxyMode, string> = Object.fromEntries(
  proxyModes.map((mode) => [mode, proxyStrategies[mode].label])
) as Record<ProxyMode, string>;

export const proxyModeNotes: Record<ProxyMode, string> = Object.fromEntries(
  proxyModes.map((mode) => [mode, proxyStrategies[mode].note])
) as Record<ProxyMode, string>;

export function getProxyStrategy(mode: ProxyMode) {
  return proxyStrategies[mode];
}

export function applyProxy(url: string, mode: ProxyMode): string {
  return proxyStrategies[mode].transform(url);
}

export function getProxyIndicatorLabel(mode: ProxyMode) {
  return mode === "direct" ? "Direct" : "Proxied";
}

export function getRetryProxyMode(mode: ProxyMode): ProxyMode {
  switch (mode) {
    case "direct":
      return "allorigins";
    case "allorigins":
      return "wayback";
    case "wayback":
      return "allorigins";
    default:
      return "allorigins";
  }
}
