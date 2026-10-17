// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

import { getAppDefinition } from "@/lib/app-registry";
import { createLaunchNonce, isTerminalProfileId, resolveLaunchProfile } from "@/lib/terminal-profiles";
import { sanitizePersistedProcesses } from "@/stores/process-store";
import { launchPayloadsMatch } from "@/stores/system-runtime";

describe("launching the terminal", () => {
  const jumpList = getAppDefinition("terminal").jumpList ?? [];

  it("lists the profiles in the taskbar menu", () => {
    expect(jumpList.map((item) => item.label)).toEqual(["PowerShell", "Command Prompt", "Linux (Virtual x86)"]);
  });

  it("gives each profile a payload the terminal understands", () => {
    for (const item of jumpList) {
      const profile = resolveLaunchProfile(item.payload?.profile);
      expect(profile).not.toBeNull();
      expect(isTerminalProfileId(profile)).toBe(true);
    }
  });

  it("keeps those payloads when processes are saved and restored", () => {
    const saved = sanitizePersistedProcesses(
      jumpList.map((item, index) => ({ id: `p${index}`, appId: "terminal", status: "running", launchPayload: item.payload, createdAt: 1 }))
    );
    expect(saved.map((process) => process.launchPayload)).toEqual(jumpList.map((item) => item.payload));
  });

  it("treats a different profile as a different launch, so the running terminal opens a tab", () => {
    const [powershell, cmd] = jumpList.map((item) => item.payload);
    expect(launchPayloadsMatch(undefined, powershell)).toBe(false);
    expect(launchPayloadsMatch(powershell, cmd)).toBe(false);
  });

  it("needs a nonce to make a repeated launch of the same profile count again", () => {
    const first = { profile: "cmd", launchNonce: createLaunchNonce() };
    const second = { profile: "cmd", launchNonce: createLaunchNonce() };
    expect(first.launchNonce).not.toBe(second.launchNonce);
    expect(launchPayloadsMatch(first, second)).toBe(false);
    expect(launchPayloadsMatch({ profile: "cmd" }, { profile: "cmd" })).toBe(true);
  });

  it("keeps the terminal single-instance", () => {
    expect(getAppDefinition("terminal").multiple).toBeFalsy();
  });
});
