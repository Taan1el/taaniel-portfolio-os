// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  appDropProps,
  findDropZone,
  folderDropProps,
  getZoneKey,
  taskbarDropProps,
  windowDropProps,
} from "@/lib/dnd/dom";

function element(props: Record<string, string | undefined> = {}, parent: Element = document.body, className = "") {
  const node = document.createElement("div");
  node.className = className;
  Object.entries(props).forEach(([name, value]) => {
    if (value !== undefined) node.setAttribute(name, value);
  });
  parent.append(node);
  return node;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("findDropZone", () => {
  it("reads a folder zone from its data attributes", () => {
    const folder = element(folderDropProps("/Documents", { windowId: "files-1", spring: true }));

    expect(findDropZone([folder])).toEqual({
      zone: { kind: "folder", path: "/Documents", surface: undefined, windowId: "files-1", spring: true },
      element: folder,
    });
  });

  it("finds a zone through the element's ancestors", () => {
    const frame = element(windowDropProps("w1", "photos"));
    const inner = element({}, element({}, frame));

    expect(findDropZone([inner])?.zone).toEqual({ kind: "window", windowId: "w1", appId: "photos" });
  });

  it("prefers the innermost zone: a folder in a window beats the window", () => {
    const frame = element(windowDropProps("w1", "files"));
    const folder = element(folderDropProps("/Documents"), frame);

    expect(findDropZone([folder, frame])?.zone).toMatchObject({ kind: "folder", path: "/Documents" });
  });

  it("recognises taskbar buttons and app icons", () => {
    expect(findDropZone([element(taskbarDropProps("w9"))])?.zone).toEqual({ kind: "taskbar", windowId: "w9" });
    expect(findDropZone([element(appDropProps("photos"))])?.zone).toEqual({ kind: "app", appId: "photos" });
  });

  it("skips the drag ghost and finds what is beneath it", () => {
    const ghost = element({ "data-dnd-ignore": "true" });
    const folder = element(folderDropProps("/Desktop"));

    expect(findDropZone([ghost, folder])?.zone).toMatchObject({ path: "/Desktop" });
  });

  it("reaches through plain overlays to the zone behind them", () => {
    const overlay = element();
    const desktop = element(folderDropProps("/Desktop", { surface: "desktop" }));

    expect(findDropZone([overlay, desktop])?.zone).toMatchObject({ kind: "folder", surface: "desktop" });
  });

  it("stops at the taskbar and other shell surfaces instead of reaching the desktop behind", () => {
    const desktop = element(folderDropProps("/Desktop", { surface: "desktop" }));

    expect(findDropZone([element({}, document.body, "taskbar w11-taskbar"), desktop])).toBeNull();
    expect(findDropZone([element({}, document.body, "w11-start"), desktop])).toBeNull();
    expect(findDropZone([element({ "data-dnd-barrier": "" }), desktop])).toBeNull();
  });

  it("still finds a taskbar button inside the taskbar", () => {
    const bar = element({}, document.body, "taskbar");
    const button = element(taskbarDropProps("w3"), bar);

    expect(findDropZone([button, bar])?.zone).toEqual({ kind: "taskbar", windowId: "w3" });
  });

  it("finds nothing over empty space", () => {
    expect(findDropZone([])).toBeNull();
    expect(findDropZone([element()])).toBeNull();
  });
});

describe("getZoneKey", () => {
  it("tells apart the same folder shown in different windows", () => {
    const a = findDropZone([element(folderDropProps("/Documents", { windowId: "w1" }))])?.zone ?? null;
    const b = findDropZone([element(folderDropProps("/Documents", { windowId: "w2" }))])?.zone ?? null;

    expect(getZoneKey(a)).not.toBe(getZoneKey(b));
    expect(getZoneKey(null)).toBe("none");
  });
});
