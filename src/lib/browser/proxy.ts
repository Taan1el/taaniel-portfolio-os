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
      "Public proxy preview through AllOrigins. Many pages render, but auth-heavy or script-heavy sites may still fail.",
    transform: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  wayback: {
    kind: "proxy",
    label: "Wayback",
    note:
      "Loads the page through a web.archive.org wrapper. Archived pages may differ from the current live site.",
    transform: (url) => `https://web.archive.org/web/*/${encodeURI(url)}`,
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
