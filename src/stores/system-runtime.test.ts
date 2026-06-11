// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  getLegacyProcessSeed,
  getLegacyWindowSeed,
  LEGACY_SYSTEM_STORAGE_KEY,
} from "@/stores/system-runtime";

describe("legacy system runtime migration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("falls back safely when legacy localStorage contains an unknown app id", () => {
    localStorage.setItem(
      LEGACY_SYSTEM_STORAGE_KEY,
      JSON.stringify({
        state: {
          windows: [
            {
              id: "window-1",
              processId: "process-1",
              appId: "not-a-real-app",
              x: 40,
              y: 40,
              width: 500,
              height: 360,
              createdAt: 1,
            },
          ],
        },
      }),
    );

    expect(getLegacyWindowSeed().windows[0]).toEqual(
      expect.objectContaining({
        id: "window-1",
        title: "About",
      }),
    );
    expect(getLegacyProcessSeed()[0]).toEqual(
      expect.objectContaining({
        id: "process-1",
        appId: "about",
      }),
    );
  });
});
