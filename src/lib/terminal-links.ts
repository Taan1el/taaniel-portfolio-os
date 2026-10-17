/**
 * Links in terminal output can come from anywhere (a web response, a file), so
 * only plain web addresses are ever followed: no javascript:, data: or file:
 * URLs, and no credentials in the address.
 */
export function safeLinkTarget(uri: string): string | null {
  if (uri.length > 2048) return null;
  try {
    const url = new URL(uri);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
