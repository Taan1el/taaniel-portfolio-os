// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaViewerApp } from "@/components/apps/media-viewer-app";
import { MusicPlayerApp } from "@/components/apps/music-player-app";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";
import type { AppId, AppWindow, FileSystemRecord, VirtualFile } from "@/types/system";

function buildWindow(appId: AppId, filePath: string): AppWindow {
  return {
    id: `win-${appId}`,
    processId: `proc-${appId}`,
    appId,
    title: appId,
    x: 0,
    y: 0,
    width: 640,
    height: 480,
    zIndex: 1,
    minimized: false,
    maximized: false,
    focused: true,
    createdAt: 0,
    processStatus: "focused",
    payload: { filePath },
  };
}

function mediaFile(path: string, mimeType: string): VirtualFile {
  const name = path.split("/").at(-1)!;

  return {
    kind: "file",
    path,
    name,
    mimeType,
    extension: name.split(".").at(-1)!,
    source: `/files${path}`,
    createdAt: 0,
    updatedAt: 0,
  };
}

const nodes: FileSystemRecord = {
  "/Media/Videos/clip.mp4": mediaFile("/Media/Videos/clip.mp4", "video/mp4"),
  "/Media/Videos/other.mp4": mediaFile("/Media/Videos/other.mp4", "video/mp4"),
  "/Media/Music/song.mp3": mediaFile("/Media/Music/song.mp3", "audio/mpeg"),
};

beforeEach(() => {
  // jsdom has no media pipeline; the music player pauses and reloads its element.
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
  useFileSystemStore.setState({ nodes });
  useSystemSettingsStore.getState().resetSettings();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useSystemSettingsStore.getState().resetSettings();
});

describe("video player master volume", () => {
  it("plays at the master volume", () => {
    useSystemSettingsStore.getState().setVolume(40);
    const { container } = render(<MediaViewerApp window={buildWindow("video", "/Media/Videos/clip.mp4")} />);

    expect(container.querySelector("video")!.volume).toBeCloseTo(0.4, 5);
  });

  it("follows the slider and mute while playing", () => {
    const { container } = render(<MediaViewerApp window={buildWindow("video", "/Media/Videos/clip.mp4")} />);
    const video = container.querySelector("video")!;

    act(() => useSystemSettingsStore.getState().setVolume(15));
    expect(video.volume).toBeCloseTo(0.15, 5);

    act(() => useSystemSettingsStore.getState().setMuted(true));
    expect(video.muted).toBe(true);
  });

  it("keeps the level set on the native controls when moving to the next file", () => {
    useSystemSettingsStore.getState().setVolume(50);
    const view = render(<MediaViewerApp window={buildWindow("video", "/Media/Videos/clip.mp4")} />);
    const video = view.container.querySelector("video")!;
    video.volume = 0.2;

    view.rerender(<MediaViewerApp window={buildWindow("video", "/Media/Videos/other.mp4")} />);
    expect(view.container.querySelector("video")).toBe(video);
    expect(video.volume).toBeCloseTo(0.2, 5);
  });
});

describe("music player master volume", () => {
  it("still has songs when told to open a path that is gone", () => {
    const { container } = render(<MusicPlayerApp window={buildWindow("music", "/Documents/removed.mp3")} />);

    expect(container.querySelector("audio")).not.toBeNull();
  });

  it("scales its own slider by the master volume", () => {
    useSystemSettingsStore.getState().setVolume(50);
    const { container } = render(<MusicPlayerApp window={buildWindow("music", "/Media/Music/song.mp3")} />);

    // The player's own slider starts at 0.72.
    expect(container.querySelector("audio")!.volume).toBeCloseTo(0.36, 5);
  });

  it("is unchanged at the default master volume", () => {
    const { container } = render(<MusicPlayerApp window={buildWindow("music", "/Media/Music/song.mp3")} />);

    expect(container.querySelector("audio")!.volume).toBeCloseTo(0.72, 5);
  });

  it("follows the master while muted and unmuted", () => {
    const { container } = render(<MusicPlayerApp window={buildWindow("music", "/Media/Music/song.mp3")} />);
    const audio = container.querySelector("audio")!;

    act(() => useSystemSettingsStore.getState().setMuted(true));
    expect(audio.muted).toBe(true);

    act(() => useSystemSettingsStore.getState().setMuted(false));
    expect(audio.muted).toBe(false);
    expect(audio.volume).toBeCloseTo(0.72, 5);
  });
});
