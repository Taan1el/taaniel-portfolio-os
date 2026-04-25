// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NotesApp } from "@/components/apps/notes-app";
import { NOTES_DIRECTORY_PATH } from "@/lib/notes";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useWindowStore } from "@/stores/window-store";
import type { AppWindow, FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

const rootDir = (): VirtualDirectory => ({
  kind: "directory",
  path: "/",
  name: "/",
  createdAt: 1,
  updatedAt: 1,
});

const dir = (path: string, name: string, updatedAt = 1): VirtualDirectory => ({
  kind: "directory",
  path,
  name,
  createdAt: 1,
  updatedAt,
});

const noteFile = (path: string, name: string, content: string, updatedAt: number): VirtualFile => ({
  kind: "file",
  path,
  name,
  extension: "txt",
  mimeType: "text/plain",
  content,
  createdAt: 1,
  updatedAt,
});

const alphaPath = `${NOTES_DIRECTORY_PATH}/Alpha.txt`;
const betaPath = `${NOTES_DIRECTORY_PATH}/Beta.txt`;

function buildNotesNodes(): FileSystemRecord {
  return {
    "/": rootDir(),
    "/Documents": dir("/Documents", "Documents"),
    [NOTES_DIRECTORY_PATH]: dir(NOTES_DIRECTORY_PATH, "Notes"),
    [alphaPath]: noteFile(alphaPath, "Alpha.txt", "alpha body", 10),
    [betaPath]: noteFile(betaPath, "Beta.txt", "beta body", 20),
  };
}

function buildWindow(filePath = betaPath): AppWindow {
  return {
    id: "window-notes",
    processId: "process-notes",
    appId: "notes",
    title: "Notes",
    payload: { filePath },
    processStatus: "focused",
    x: 0,
    y: 0,
    width: 900,
    height: 640,
    minimized: false,
    maximized: false,
    focused: true,
    zIndex: 3,
    createdAt: 1,
  };
}

function getNoteButton(label: string) {
  const text = screen.getByText(label);
  const button = text.closest("button");

  if (!button) {
    throw new Error(`Unable to find button for note ${label}`);
  }

  return button;
}

function getTitleInput() {
  return screen.getByLabelText("Note title") as HTMLInputElement;
}

function getEditor(label: string) {
  return screen.getByLabelText(`Note editor for ${label}`) as HTMLTextAreaElement;
}

async function waitForStoreWrite(path: string, expectedContent: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const file = useFileSystemStore.getState().readFile(path);

    if (file?.content === expectedContent) {
      return;
    }

    await act(async () => {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 20));
    });
  }

  expect(useFileSystemStore.getState().readFile(path)?.content).toBe(expectedContent);
}

beforeEach(() => {
  localStorage.clear();
  useFileSystemStore.setState({ nodes: buildNotesNodes(), initialized: true });
  useProcessStore.setState({ processes: [] });
  useWindowStore.setState({ windows: [], activeWindowId: null, nextZ: 2 });

  if (!globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      globalThis.setTimeout(() => callback(Date.now()), 0) as unknown as number;
  }

  if (!globalThis.cancelAnimationFrame) {
    globalThis.cancelAnimationFrame = (handle: number) => {
      globalThis.clearTimeout(handle);
    };
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  useFileSystemStore.setState({ nodes: {}, initialized: false });
  useProcessStore.setState({ processes: [] });
  useWindowStore.setState({ windows: [], activeWindowId: null, nextZ: 2 });
  vi.restoreAllMocks();
});

describe("NotesApp", () => {
  it("honors the requested note once and preserves a later manual selection after autosave updates the list", async () => {
    render(<NotesApp window={buildWindow(betaPath)} />);

    expect(getTitleInput().value).toBe("Beta");

    fireEvent.click(getNoteButton("Alpha"));
    expect(getTitleInput().value).toBe("Alpha");

    fireEvent.change(getEditor("Alpha"), {
      target: { value: "alpha updated" },
    });

    await act(async () => {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 220));
    });

    await waitForStoreWrite(alphaPath, "alpha updated");

    expect(getTitleInput().value).toBe("Alpha");
    expect(getNoteButton("Alpha").getAttribute("aria-current")).toBe("true");
    expect(getNoteButton("Beta").getAttribute("aria-current")).toBeNull();
  });

  it("honors a requested note path that needs slash normalization", () => {
    render(<NotesApp window={buildWindow("\\Documents\\Notes\\Alpha.txt")} />);

    expect(getTitleInput().value).toBe("Alpha");
    expect(getNoteButton("Alpha").getAttribute("aria-current")).toBe("true");
  });

  it("flushes a pending autosave immediately when switching to another note", async () => {
    render(<NotesApp window={buildWindow(alphaPath)} />);

    fireEvent.change(getEditor("Alpha"), {
      target: { value: "alpha saved on switch" },
    });

    fireEvent.click(getNoteButton("Beta"));

    await waitForStoreWrite(alphaPath, "alpha saved on switch");

    expect(getTitleInput().value).toBe("Beta");
    expect(getEditor("Beta").value).toBe("beta body");
  });

  it("flushes a pending autosave when the app unmounts", async () => {
    const view = render(<NotesApp window={buildWindow(alphaPath)} />);

    fireEvent.change(getEditor("Alpha"), {
      target: { value: "alpha saved on unmount" },
    });

    view.unmount();

    await waitForStoreWrite(alphaPath, "alpha saved on unmount");
  });
});
