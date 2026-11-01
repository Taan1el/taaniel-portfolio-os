const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** How far ahead the guide keeps. The job runs again long before this runs out. */
export const GUIDE_HOURS = 36;
const MAX_TITLE = 120;

export function decodeText(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(?:#(\d+)|#x([0-9a-f]+)|(\w+));/gi, (whole, decimal, hex, name) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      return ENTITIES[name] ?? whole;
    })
    .trim();
}

/** XMLTV times look like 20261101035623 +0000. */
export function parseXmltvTime(value) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-])(\d{2})(\d{2})/.exec(value ?? "");
  if (!match) return null;
  const [, year, month, day, hour, minute, second, sign, offsetHour, offsetMinute] = match;
  const offset = (Number(offsetHour) * 60 + Number(offsetMinute)) * 60_000 * (sign === "+" ? 1 : -1);
  return Date.UTC(+year, +month - 1, +day, +hour, +minute, +second) - offset;
}

const attribute = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;

/** Only what the guide uses: each channel's names, and each programme's times and title. */
export function parseXmltv(xml) {
  const channels = new Map();

  for (const [, tag, body] of xml.matchAll(/<channel\b([^>]*)>([\s\S]*?)<\/channel>/g)) {
    const id = attribute(tag, "id");
    if (!id) continue;
    const names = [...body.matchAll(/<display-name\b[^>]*>([\s\S]*?)<\/display-name>/g)].map((match) => decodeText(match[1]));
    channels.set(id, { names, programmes: [] });
  }

  for (const [, tag, body] of xml.matchAll(/<programme\b([^>]*)>([\s\S]*?)<\/programme>/g)) {
    const channel = channels.get(attribute(tag, "channel"));
    const start = parseXmltvTime(attribute(tag, "start"));
    const stop = parseXmltvTime(attribute(tag, "stop"));
    const title = decodeText(/<title\b[^>]*>([\s\S]*?)<\/title>/.exec(body)?.[1] ?? "");
    if (channel && start !== null && stop !== null && stop > start && title) channel.programmes.push({ start, stop, title });
  }

  return channels;
}

/** Names match only when they are the same name, with the usual suffixes aside. Close is not good enough: it would show the wrong programme. */
export function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/&amp;|&/g, "and")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\b(uk|us|usa|hd|tv|channel|the|network)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

/** Keeps what is on or still to come, in order, with nothing overlapping. */
export function trimProgrammes(programmes, now) {
  const until = now + GUIDE_HOURS * 3_600_000;
  const kept = [];

  for (const { start, stop, title } of [...programmes].sort((a, b) => a.start - b.start)) {
    if (stop <= now || start >= until) continue;
    if (kept.length && start < kept[kept.length - 1][1]) continue;
    kept.push([start, stop, title.slice(0, MAX_TITLE)]);
  }

  return kept;
}

/**
 * Lines each channel up with listings for its own region. The first source with
 * something on now wins. A channel nobody lists is left out, so the guide shows
 * nothing for it.
 */
export function buildGuide(channels, sources, now) {
  const guide = {};

  for (const channel of channels) {
    const wanted = normalizeName(channel.name);

    for (const source of sources.filter((entry) => entry.region === channel.region)) {
      const programmes = source.byId?.[channel.id] ?? [...source.channels.values()].find((entry) => entry.names.some((name) => normalizeName(name) === wanted))?.programmes;
      const kept = trimProgrammes(programmes ?? [], now);
      if (kept.length && kept[0][0] <= now) {
        guide[channel.id] = kept;
        break;
      }
    }
  }

  return guide;
}

/** Telia's guide pairs a list of titles with a list of times. */
export function parseTeliaGuide(data, channelId) {
  const items = data?.categoryItems?.[channelId] ?? [];
  const programmes = [];

  for (const item of items) {
    const details = data?.relations?.programmes?.[item?.related?.programmeIds?.[0]];
    const start = Date.parse(details?.startAt ?? "");
    const stop = Date.parse(details?.endAt ?? "");
    if (typeof item.name === "string" && item.name && stop > start) programmes.push({ start, stop, title: item.name });
  }

  return programmes;
}
