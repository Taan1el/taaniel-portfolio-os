// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizePersistedProcesses } from "@/stores/process-store";

describe("process store persistence sanitizers", () => {
  it("keeps known apps while normalizing status and legacy payload shape", () => {
    expect(
      sanitizePersistedProcesses([
        {
          id: "process-1",
          appId: "notes",
          status: "not-a-status",
          payload: {
            filePath: "/Documents/note.md",
            title: 42,
          },
          createdAt: 123,
        },
      ]),
    ).toEqual([
      {
        id: "process-1",
        appId: "notes",
        status: "running",
        launchPayload: {
          filePath: "/Documents/note.md",
        },
        createdAt: 123,
      },
    ]);
  });

  it("drops malformed processes and unknown app ids", () => {
    expect(
      sanitizePersistedProcesses([
        {
          id: "process-1",
          appId: "not-an-app",
          status: "running",
          createdAt: 123,
        },
        {
          appId: "about",
          status: "running",
          createdAt: 123,
        },
        null,
      ]),
    ).toEqual([]);
  });

  it("falls back to an empty process list for non-array values", () => {
    expect(sanitizePersistedProcesses({ processes: [] })).toEqual([]);
  });
});
