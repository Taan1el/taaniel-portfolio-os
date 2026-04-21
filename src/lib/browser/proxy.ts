export type ProxyMode = "direct" | "allorigins" | "wayback";

type ProxyTransformer = (url: string) => string;

export const proxyModes: ProxyMode[] = ["direct", "allorigins", "wayback"];

const proxyTransformers: Record<ProxyMode, ProxyTransformer> = {
  direct: (url) => url,
  allorigins: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  wayback: (url) => `https://web.archive.org/web/*/${encodeURI(url)}`,
};

export const proxyModeLabels: Record<ProxyMode, string> = {
  direct: "Direct",
  allorigins: "AllOrigins",
  wayback: "Wayback",
};

export const proxyModeNotes: Record<ProxyMode, string> = {
  direct:
    "Direct iframe mode. Google iframe pages, Wikipedia, and some static sites work here. Sites that block framing still need a proxy or a new tab.",
  allorigins:
    "Public proxy preview through AllOrigins. Many pages render, but auth-heavy or script-heavy sites may still fail.",
  wayback:
    "Loads the page through a web.archive.org wrapper. Archived pages may differ from the current live site.",
};

export function applyProxy(url: string, mode: ProxyMode): string {
  return proxyTransformers[mode](url);
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
