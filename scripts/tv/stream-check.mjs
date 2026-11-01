/** The site that plays these streams. hls.js needs each host to allow it. */
export const SITE_ORIGIN = "https://taan1el.github.io";

const USER_AGENT = "Mozilla/5.0 (compatible; taaniel-os-channel-check)";
const TIMEOUT_MS = 20_000;
/** A host refusing this runner says nothing about viewers elsewhere: many streams stay in their own country. */
const REFUSED = new Set([401, 403, 451]);

const ok = () => ({ status: "ok", reason: "" });
const dead = (reason) => ({ status: "dead", reason });
const refused = (reason) => ({ status: "blocked", reason });

const failure = (what, code) => (REFUSED.has(code) ? refused(`${what} refused (HTTP ${code})`) : dead(`${what} failed (HTTP ${code})`));

/** The first thing a playlist points at, and whether that is another playlist or a video segment. */
export function nextInPlaylist(text, base) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const uri = lines.find((line) => line && !line.startsWith("#"));
  if (!uri) return null;
  return { url: new URL(uri, base).href, isPlaylist: lines.some((line) => line.startsWith("#EXT-X-STREAM-INF")) };
}

export function allowsSite(headers) {
  const allowed = headers.get("access-control-allow-origin");
  return allowed === "*" || allowed === SITE_ORIGIN;
}

async function open(url, fetchImpl, useOrigin) {
  const headers = { "User-Agent": USER_AGENT, ...(useOrigin ? { Origin: SITE_ORIGIN } : {}) };
  return fetchImpl(url, { headers, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function hasBytes(response) {
  const reader = response.body?.getReader();
  if (!reader) return false;
  const { value } = await reader.read();
  await reader.cancel().catch(() => {});
  return Boolean(value?.length);
}

async function checkHls(startUrl, fetchImpl) {
  let url = startUrl;

  // Master playlist, then variant, then one real segment. A live variant can point at one more level.
  for (let depth = 0; depth < 4; depth += 1) {
    const response = await open(url, fetchImpl, true);
    if (!response.ok) return failure("playlist", response.status);
    if (!allowsSite(response.headers)) return dead("host no longer allows this site");

    const next = nextInPlaylist(await response.text(), response.url || url);
    if (!next) return dead("playlist is empty");
    if (next.isPlaylist) {
      url = next.url;
      continue;
    }

    const segment = await open(next.url, fetchImpl, true);
    if (!segment.ok) return failure("video segment", segment.status);
    if (!allowsSite(segment.headers)) return dead("host no longer allows this site");
    return (await hasBytes(segment)) ? ok() : dead("video segment is empty");
  }

  return dead("playlist never reaches any video");
}

async function checkPlainStream(url, fetchImpl) {
  const response = await open(url, fetchImpl, false);
  if (!response.ok) return failure("stream", response.status);
  return (await hasBytes(response)) ? ok() : dead("stream sends nothing");
}

/** Walks a stream the way a player would. Checks a real segment, because a playlist can outlive its video. */
export async function checkStream(url, fetchImpl = fetch) {
  try {
    return await (/\.m3u8?(\?|$)/i.test(url) ? checkHls(url, fetchImpl) : checkPlainStream(url, fetchImpl));
  } catch (error) {
    return dead(error?.name === "TimeoutError" ? "timed out" : `network error: ${error?.cause?.code ?? error?.message ?? "unknown"}`);
  }
}

export async function checkAll(channels, { fetchImpl = fetch, concurrency = 8 } = {}) {
  const results = [];
  let index = 0;

  const worker = async () => {
    while (index < channels.length) {
      const channel = channels[index++];
      results.push({ channel, ...(await checkStream(channel.url, fetchImpl)) });
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

const line = ({ channel, reason }) => `- **${channel.name}** (\`${channel.id}\`, ${channel.region}): ${reason}`;

/** The text of the issue. Dead channels ask for a decision; refused ones are for information. */
export function formatReport(results, checkedAt) {
  const deadOnes = results.filter((result) => result.status === "dead");
  const blocked = results.filter((result) => result.status === "blocked");
  const playing = results.filter((result) => result.status === "ok").length;

  return [
    `Checked ${results.length} channels on ${checkedAt}: ${playing} playing, ${deadOnes.length} not playing, ${blocked.length} refused this runner.`,
    "",
    ...(deadOnes.length ? ["## Not playing", "", ...deadOnes.map(line), "", "Find a new source or remove these from `src/data/live-channels.ts`.", ""] : []),
    ...(blocked.length ? ["## Refused this runner", "", "Often only region locking, so these may still play for viewers in their own country.", "", ...blocked.map(line), ""] : []),
  ].join("\n");
}
