// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GUIDE_HOURS, buildGuide, decodeText, normalizeName, parseTeliaGuide, parseXmltv, parseXmltvTime, trimProgrammes } from "./xmltv.mjs";

const hour = 3_600_000;
const now = Date.UTC(2026, 10, 1, 12);
const xml = `<?xml version="1.0"?><tv>
  <channel id="a"><display-name lang="en">Fail &amp; Win</display-name><display-name>FW</display-name></channel>
  <channel id="b"><display-name>Other</display-name></channel>
  <programme channel="a" start="20261101110000 +0000" stop="20261101130000 +0000"><title lang="en">Big &lt;Show&gt;</title><desc>x</desc></programme>
  <programme start="20261101130000 +0200" stop="20261101140000 +0200" channel="a"><title><![CDATA[Late]]></title></programme>
  <programme channel="a" start="bad" stop="20261101140000 +0000"><title>No start</title></programme>
  <programme channel="a" start="20261101150000 +0000" stop="20261101140000 +0000"><title>Backwards</title></programme>
  <programme channel="a" start="20261101150000 +0000" stop="20261101160000 +0000"><title></title></programme>
  <programme channel="ghost" start="20261101110000 +0000" stop="20261101130000 +0000"><title>Nobody</title></programme>
</tv>`;

describe("xmltv", () => {
  it("decodes text", () => {
    expect(decodeText("Tom &amp; Jerry &#39;s &#x41;")).toBe("Tom & Jerry 's A");
    expect(decodeText("<![CDATA[A & B]]>")).toBe("A & B");
    expect(decodeText("&nosuch;")).toBe("&nosuch;");
  });

  it("reads times and their offsets", () => {
    expect(parseXmltvTime("20261101120000 +0000")).toBe(now);
    expect(parseXmltvTime("20261101140000 +0200")).toBe(now);
    expect(parseXmltvTime("20261101070000 -0500")).toBe(now);
    expect(parseXmltvTime("nonsense")).toBeNull();
    expect(parseXmltvTime(null)).toBeNull();
  });

  it("reads channels and sound programmes, in any attribute order", () => {
    const channels = parseXmltv(xml);

    expect(channels.get("a").names).toEqual(["Fail & Win", "FW"]);
    expect(channels.get("a").programmes.map((programme) => programme.title)).toEqual(["Big <Show>", "Late"]);
    expect(channels.get("b").programmes).toEqual([]);
    expect(channels.has("ghost")).toBe(false);
  });
});

describe("names", () => {
  it("ignores the usual suffixes", () => {
    expect(normalizeName("FailArmy UK")).toBe(normalizeName("FailArmy"));
    expect(normalizeName("The Pet Collective (GB)")).toBe(normalizeName("Pet Collective"));
    expect(normalizeName("Horse & Country TV")).toBe(normalizeName("Horse and Country"));
  });

  it("keeps different channels different", () => {
    expect(normalizeName("BBC Earth")).not.toBe(normalizeName("BBC News"));
    expect(normalizeName("Autentic History")).not.toBe(normalizeName("Autentic Travel"));
  });
});

describe("trimming", () => {
  const show = (from, to, title = "Show") => ({ start: now + from * hour, stop: now + to * hour, title });

  it("drops what has ended and what is too far off", () => {
    const kept = trimProgrammes([show(-3, -1, "Gone"), show(-1, 1, "Now"), show(GUIDE_HOURS + 1, GUIDE_HOURS + 2, "Far")], now);

    expect(kept.map((entry) => entry[2])).toEqual(["Now"]);
  });

  it("sorts, and drops an overlap", () => {
    const kept = trimProgrammes([show(1, 2, "Second"), show(0, 1, "First"), show(1.5, 3, "Clash")], now);

    expect(kept.map((entry) => entry[2])).toEqual(["First", "Second"]);
  });

  it("caps long titles", () => {
    expect(trimProgrammes([show(0, 1, "x".repeat(500))], now)[0][2]).toHaveLength(120);
  });
});

describe("guide", () => {
  const channel = (id, name, region = "uk") => ({ id, name, region });
  const source = (region, name, programmes) => ({ region, channels: new Map([["x", { names: [name], programmes }]]) });
  const onNow = { start: now - hour, stop: now + hour, title: "On now" };

  it("matches by name within the region", () => {
    expect(buildGuide([channel("c", "FailArmy UK")], [source("uk", "FailArmy", [onNow])], now).c[0][2]).toBe("On now");
  });

  it("does not borrow from another region", () => {
    expect(buildGuide([channel("c", "FailArmy", "uk")], [source("us", "FailArmy", [onNow])], now)).toEqual({});
  });

  it("leaves out a channel nobody lists", () => {
    expect(buildGuide([channel("c", "Nobody Lists This")], [source("uk", "FailArmy", [onNow])], now)).toEqual({});
  });

  it("leaves out a listing that has nothing on now", () => {
    const later = { start: now + hour, stop: now + 2 * hour, title: "Later" };

    expect(buildGuide([channel("c", "FailArmy")], [source("uk", "FailArmy", [later])], now)).toEqual({});
  });

  it("tries the next source when one has run out", () => {
    const old = { start: now - 3 * hour, stop: now - hour, title: "Old" };
    const guide = buildGuide([channel("c", "FailArmy")], [source("uk", "FailArmy", [old]), source("uk", "FailArmy", [onNow])], now);

    expect(guide.c[0][2]).toBe("On now");
  });

  it("uses a listing keyed to the channel itself", () => {
    const direct = { region: "ee", channels: new Map(), byId: { etv: [onNow] } };

    expect(buildGuide([channel("etv", "ETV", "ee")], [direct], now).etv).toHaveLength(1);
  });
});

describe("telia", () => {
  const data = {
    categoryItems: { 1: [{ name: "Elu", related: { programmeIds: [5] } }, { name: "Lost", related: { programmeIds: [6] } }, { name: "", related: { programmeIds: [7] } }] },
    relations: { programmes: { 5: { startAt: "2026-11-01T10:00:00+02:00", endAt: "2026-11-01T11:00:00+02:00" }, 7: { startAt: "2026-11-01T11:00:00+02:00", endAt: "2026-11-01T12:00:00+02:00" } } },
  };

  it("pairs titles with their times", () => {
    expect(parseTeliaGuide(data, "1")).toEqual([{ start: Date.parse("2026-11-01T08:00:00Z"), stop: Date.parse("2026-11-01T09:00:00Z"), title: "Elu" }]);
  });

  it("gives nothing for a shape it does not know", () => {
    expect(parseTeliaGuide(null, "1")).toEqual([]);
    expect(parseTeliaGuide({ error: "x" }, "1")).toEqual([]);
  });
});
