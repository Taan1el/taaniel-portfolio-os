// @vitest-environment node
import { describe, expect, it } from "vitest";
import { checkAll, checkStream, formatReport, nextInPlaylist } from "./stream-check.mjs";

const cors = { "access-control-allow-origin": "*" };
const master = "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nlow/index.m3u8\n";
const media = "#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nseg1.ts\n";

/** Answers from a url → [status, body, headers] table. */
const fakeFetch = (routes) => async (url) => {
  const route = routes[url];
  if (!route) throw Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } });
  const [status, body, headers = cors] = route;
  const response = new Response(status === 204 ? null : body, { status, headers });
  Object.defineProperty(response, "url", { value: url });
  return response;
};

describe("playlists", () => {
  it("finds the variant in a master playlist", () => {
    expect(nextInPlaylist(master, "https://a.tv/live/master.m3u8")).toEqual({ url: "https://a.tv/live/low/index.m3u8", isPlaylist: true });
  });

  it("finds a segment in a media playlist", () => {
    expect(nextInPlaylist(media, "https://a.tv/live/i.m3u8")).toEqual({ url: "https://a.tv/live/seg1.ts", isPlaylist: false });
  });

  it("copes with Windows line ends and absolute links", () => {
    expect(nextInPlaylist("#EXTM3U\r\n#EXTINF:6,\r\nhttps://b.tv/s.ts\r\n", "https://a.tv/")?.url).toBe("https://b.tv/s.ts");
  });

  it("says when there is nothing in it", () => {
    expect(nextInPlaylist("#EXTM3U\n#EXT-X-ENDLIST\n", "https://a.tv/")).toBeNull();
  });
});

describe("stream check", () => {
  const live = {
    "https://a.tv/m.m3u8": [200, master],
    "https://a.tv/low/index.m3u8": [200, media],
    "https://a.tv/low/seg1.ts": [200, "video"],
  };

  it("passes a stream with a real segment", async () => {
    expect((await checkStream("https://a.tv/m.m3u8", fakeFetch(live))).status).toBe("ok");
  });

  it("calls a missing playlist dead", async () => {
    expect(await checkStream("https://a.tv/m.m3u8", fakeFetch({ "https://a.tv/m.m3u8": [404, ""] }))).toMatchObject({ status: "dead", reason: "playlist failed (HTTP 404)" });
  });

  it("does not call a refusal dead", async () => {
    expect((await checkStream("https://a.tv/m.m3u8", fakeFetch({ "https://a.tv/m.m3u8": [403, ""] }))).status).toBe("blocked");
    expect((await checkStream("https://a.tv/m.m3u8", fakeFetch({ "https://a.tv/m.m3u8": [451, ""] }))).status).toBe("blocked");
  });

  it("catches a playlist that outlived its video", async () => {
    const result = await checkStream("https://a.tv/m.m3u8", fakeFetch({ ...live, "https://a.tv/low/seg1.ts": [500, ""] }));

    expect(result).toMatchObject({ status: "dead", reason: "video segment failed (HTTP 500)" });
  });

  it("catches a host that stops allowing the site", async () => {
    const result = await checkStream("https://a.tv/m.m3u8", fakeFetch({ ...live, "https://a.tv/m.m3u8": [200, master, {}] }));

    expect(result).toMatchObject({ status: "dead", reason: "host no longer allows this site" });
  });

  it("accepts the site's own origin", async () => {
    const own = { "access-control-allow-origin": "https://taan1el.github.io" };
    const routes = { "https://a.tv/m.m3u8": [200, media, own], "https://a.tv/seg1.ts": [200, "video", own] };

    expect((await checkStream("https://a.tv/m.m3u8", fakeFetch(routes))).status).toBe("ok");
  });

  it("calls an empty playlist dead", async () => {
    expect((await checkStream("https://a.tv/m.m3u8", fakeFetch({ "https://a.tv/m.m3u8": [200, "#EXTM3U\n"] }))).status).toBe("dead");
  });

  it("stops following playlists that only point at playlists", async () => {
    const loop = { "https://a.tv/m.m3u8": [200, "#EXT-X-STREAM-INF:BANDWIDTH=1\nm.m3u8\n"] };

    expect(await checkStream("https://a.tv/m.m3u8", fakeFetch(loop))).toMatchObject({ status: "dead", reason: "playlist never reaches any video" });
  });

  it("reports a network failure", async () => {
    expect(await checkStream("https://gone.tv/m.m3u8", fakeFetch({}))).toMatchObject({ status: "dead", reason: "network error: ENOTFOUND" });
  });

  it("checks plain audio without asking for CORS", async () => {
    const radio = { "https://r.ee/raadio2.mp3": [200, "audio", {}] };

    expect((await checkStream("https://r.ee/raadio2.mp3", fakeFetch(radio))).status).toBe("ok");
  });

  it("checks a whole line-up", async () => {
    const channels = [{ url: "https://a.tv/m.m3u8" }, { url: "https://b.tv/m.m3u8" }, { url: "https://c.tv/m.m3u8" }];
    const results = await checkAll(channels, { fetchImpl: fakeFetch(live), concurrency: 2 });

    expect(results.map((result) => result.status).sort()).toEqual(["dead", "dead", "ok"]);
  });
});

describe("report", () => {
  const channel = (name) => ({ name, id: name.toLowerCase(), region: "uk" });
  const results = [
    { channel: channel("One"), status: "ok", reason: "" },
    { channel: channel("Two"), status: "dead", reason: "timed out" },
    { channel: channel("Three"), status: "blocked", reason: "playlist refused (HTTP 403)" },
  ];

  it("sums up the run", () => {
    expect(formatReport(results, "2026-11-01")).toContain("Checked 3 channels on 2026-11-01: 1 playing, 1 not playing, 1 refused this runner.");
  });

  it("names the dead apart from the refused", () => {
    const [dead, refused] = formatReport(results, "2026-11-01").split("## Refused this runner");

    expect(dead).toContain("**Two**");
    expect(dead).not.toContain("**Three**");
    expect(refused).toContain("**Three**");
  });

  it("leaves out empty sections", () => {
    expect(formatReport([results[0]], "2026-11-01")).not.toContain("##");
  });
});
