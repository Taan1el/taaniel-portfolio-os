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

  it("keeps a known Settings page and drops unknown ones", () => {
    expect(
      sanitizePersistedProcesses([
        { id: "process-1", appId: "settings", launchPayload: { section: "sound" }, createdAt: 1 },
        { id: "process-2", appId: "settings", launchPayload: { section: "registry-editor" }, createdAt: 2 },
      ]).map((process) => process.launchPayload),
    ).toEqual([{ section: "sound" }, undefined]);
  });

  it("keeps a terminal profile and launch nonce only when they are short ids", () => {
    const [kept, dropped] = sanitizePersistedProcesses([
      { id: "process-1", appId: "terminal", status: "running", launchPayload: { profile: "cmd", launchNonce: "launch-1a2b" }, createdAt: 1 },
      {
        id: "process-2",
        appId: "terminal",
        status: "running",
        launchPayload: { profile: "<script>", launchNonce: "x".repeat(200), directoryPath: "/Documents" },
        createdAt: 1,
      },
    ]);

    expect(kept.launchPayload).toEqual({ profile: "cmd", launchNonce: "launch-1a2b" });
    expect(dropped.launchPayload).toEqual({ directoryPath: "/Documents" });
  });

  it("falls back to an empty process list for non-array values", () => {
    expect(sanitizePersistedProcesses({ processes: [] })).toEqual([]);
  });
});
