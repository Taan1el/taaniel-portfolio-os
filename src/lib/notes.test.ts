import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTE_CONTENT,
  DEFAULT_NOTE_PATH,
  DOCUMENTS_DIRECTORY_PATH,
  NOTES_DIRECTORY_PATH,
  ensureNotesWorkspace,
} from "@/lib/notes";
import type { FileSystemRecord } from "@/types/system";

describe("ensureNotesWorkspace", () => {
  it("creates the documents and notes directories plus the default note when missing", () => {
    const nodes = ensureNotesWorkspace({});

    expect(nodes[DOCUMENTS_DIRECTORY_PATH]).toEqual(
      expect.objectContaining({
        kind: "directory",
        path: DOCUMENTS_DIRECTORY_PATH,
        name: "Documents",
      })
    );
    expect(nodes[NOTES_DIRECTORY_PATH]).toEqual(
      expect.objectContaining({
        kind: "directory",
        path: NOTES_DIRECTORY_PATH,
        name: "Notes",
      })
    );
    expect(nodes[DEFAULT_NOTE_PATH]).toEqual(
      expect.objectContaining({
        kind: "file",
        path: DEFAULT_NOTE_PATH,
        content: DEFAULT_NOTE_CONTENT,
      })
    );
  });

  it("repairs invalid node kinds at the required note workspace paths", () => {
    const invalidNodes: FileSystemRecord = {
      [DOCUMENTS_DIRECTORY_PATH]: {
        kind: "file",
        path: DOCUMENTS_DIRECTORY_PATH,
        name: "Documents",
        createdAt: 1,
        updatedAt: 1,
        extension: "txt",
        mimeType: "text/plain",
        content: "wrong node kind",
      },
      [NOTES_DIRECTORY_PATH]: {
        kind: "file",
        path: NOTES_DIRECTORY_PATH,
        name: "Notes",
        createdAt: 1,
        updatedAt: 1,
        extension: "txt",
        mimeType: "text/plain",
        content: "still wrong",
      },
      [DEFAULT_NOTE_PATH]: {
        kind: "directory",
        path: DEFAULT_NOTE_PATH,
        name: "To-do list.txt",
        createdAt: 1,
        updatedAt: 1,
      },
    };

    const nodes = ensureNotesWorkspace(invalidNodes);

    expect(nodes[DOCUMENTS_DIRECTORY_PATH]).toEqual(
      expect.objectContaining({
        kind: "directory",
        path: DOCUMENTS_DIRECTORY_PATH,
      })
    );
    expect(nodes[NOTES_DIRECTORY_PATH]).toEqual(
      expect.objectContaining({
        kind: "directory",
        path: NOTES_DIRECTORY_PATH,
      })
    );
    expect(nodes[DEFAULT_NOTE_PATH]).toEqual(
      expect.objectContaining({
        kind: "file",
        path: DEFAULT_NOTE_PATH,
        content: DEFAULT_NOTE_CONTENT,
      })
    );
  });
});
