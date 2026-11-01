// Writes public/tv-guide.json from free public listings. A source that fails is
// skipped, and its channels show no programme: the guide never makes one up.
import { mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { LIVE_CHANNELS } from "../src/data/live-channels.ts";
import { buildGuide, parseTeliaGuide, parseXmltv } from "./tv/xmltv.mjs";

const OUTPUT = new URL("../public/tv-guide.json", import.meta.url);
const TIMEOUT_MS = 60_000;

/** Best match for the streams first: most of these channels come from the same free TV services. */
const XMLTV_SOURCES = [
  ["uk", "https://i.mjh.nz/SamsungTVPlus/gb.xml.gz"],
  ["uk", "https://i.mjh.nz/PlutoTV/gb.xml.gz"],
  ["uk", "https://epgshare01.online/epgshare01/epg_ripper_UK1.xml.gz"],
  ["uk", "https://epg.pw/xmltv/epg_GB.xml.gz"],
  ["us", "https://i.mjh.nz/SamsungTVPlus/us.xml.gz"],
  ["us", "https://i.mjh.nz/PlutoTV/us.xml.gz"],
  ["us", "https://i.mjh.nz/Plex/us.xml.gz"],
];

/** Channel ids on Telia's public guide, as listed by iptv-org. */
const TELIA_CHANNELS = { etv: "1", etv2: "111", "etv-plus": "1252" };

async function loadXmltv(region, url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const xml = (bytes[0] === 0x1f ? gunzipSync(bytes) : bytes).toString("utf8");
  return { region, channels: parseXmltv(xml) };
}

async function loadTelia(now) {
  const byId = {};
  const day = (offset) => new Date(now + offset * 86_400_000).toISOString().slice(0, 16);

  for (const [id, channelId] of Object.entries(TELIA_CHANNELS)) {
    const query = `channelIds=${channelId}&relations=programmes&startAt=${day(2)}&startAtOp=lte&endAt=${day(-1)}&endAtOp=gt`;
    const response = await fetch(`https://api.teliatv.ee/dtv-api/3.2/et/epg/guide?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    byId[id] = parseTeliaGuide(await response.json(), channelId);
  }

  return { region: "ee", channels: new Map(), byId };
}

const now = Date.now();
const settled = await Promise.allSettled([loadTelia(now), ...XMLTV_SOURCES.map(([region, url]) => loadXmltv(region, url))]);

settled.forEach((result, index) => {
  if (result.status === "rejected") console.warn(`Skipped ${XMLTV_SOURCES[index - 1]?.[1] ?? "Telia"}: ${result.reason?.message}`);
});

const sources = settled.filter((result) => result.status === "fulfilled").map((result) => result.value);
const tv = LIVE_CHANNELS.filter((channel) => channel.kind === "tv");
const channels = buildGuide(tv, sources, now);

mkdirSync(new URL("./", OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify({ generatedAt: now, channels }));
console.log(`Guide for ${Object.keys(channels).length} of ${tv.length} channels from ${sources.length} of ${settled.length} sources.`);
