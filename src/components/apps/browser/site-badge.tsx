import { BrowserIcon, FileIcon } from "@/components/icons/apps";
import { isInternalPage } from "@/lib/browser/urlUtils";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function hueOf(text: string) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

/**
 * A site's icon, drawn locally as a coloured letter. Real favicons would mean
 * asking a third-party service about every site visited, so none are fetched.
 */
export function SiteBadge({ url, size = 16 }: { url: string; size?: number }) {
  if (isInternalPage(url)) return <BrowserIcon size={size} />;
  if (url.startsWith("/")) return <FileIcon size={size} />;

  const host = hostOf(url);
  const letter = (host[0] ?? "?").toUpperCase();

  return (
    <span
      className="w11-site-badge"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.56),
        background: `hsl(${hueOf(host)} 52% 42%)`,
      }}
    >
      {letter}
    </span>
  );
}

export function displayHost(url: string) {
  return hostOf(url) || url;
}
