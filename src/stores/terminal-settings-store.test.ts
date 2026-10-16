// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getTerminalProfile, resolveLaunchProfile } from "@/lib/terminal-profiles";
import {
  DEFAULT_TERMINAL_SETTINGS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  sanitizeTerminalSettings,
  useTerminalSettingsStore,
} from "@/stores/terminal-settings-store";

beforeEach(() => {
  useTerminalSettingsStore.getState().reset();
});

describe("terminal settings are untrusted on read", () => {
  it("falls back to the defaults for garbage", () => {
    expect(sanitizeTerminalSettings(undefined)).toEqual(DEFAULT_TERMINAL_SETTINGS);
    expect(sanitizeTerminalSettings("nope")).toEqual(DEFAULT_TERMINAL_SETTINGS);
  });

  it("keeps good fields and replaces bad ones one by one", () => {
    const clean = sanitizeTerminalSettings({
      schemeId: "one-half-light",
      fontSize: 400,
      cursorShape: "vintage",
      cursorBlink: "yes",
      screenReaderMode: true,
      defaultProfile: "bash",
      copyOnSelect: true,
      multiLinePasteWarning: 0,
    });

    expect(clean).toEqual({
      ...DEFAULT_TERMINAL_SETTINGS,
      schemeId: "one-half-light",
      fontSize: MAX_FONT_SIZE,
      screenReaderMode: true,
      copyOnSelect: true,
    });
  });

  it("drops unknown colour schemes", () => {
    expect(sanitizeTerminalSettings({ schemeId: "<img onerror>" }).schemeId).toBe(DEFAULT_TERMINAL_SETTINGS.schemeId);
  });
});

describe("terminal settings store", () => {
  it("updates through the same sanitizer", () => {
    useTerminalSettingsStore.getState().update({ screenReaderMode: true, defaultProfile: "cmd" });
    expect(useTerminalSettingsStore.getState().screenReaderMode).toBe(true);
    expect(useTerminalSettingsStore.getState().defaultProfile).toBe("cmd");

    useTerminalSettingsStore.getState().update({ schemeId: "missing" });
    expect(useTerminalSettingsStore.getState().schemeId).toBe(DEFAULT_TERMINAL_SETTINGS.schemeId);
  });

  it("zooms the font within bounds", () => {
    const { changeFontSize } = useTerminalSettingsStore.getState();
    changeFontSize(-100);
    expect(useTerminalSettingsStore.getState().fontSize).toBe(MIN_FONT_SIZE);
    changeFontSize(2);
    expect(useTerminalSettingsStore.getState().fontSize).toBe(MIN_FONT_SIZE + 2);
  });

  it("persists only the settings, not the actions", () => {
    useTerminalSettingsStore.getState().update({ fontSize: 18 });
    const saved = JSON.parse(window.localStorage.getItem("taaniel-os-terminal-settings") ?? "{}");
    expect(saved.state).toEqual({ ...DEFAULT_TERMINAL_SETTINGS, fontSize: 18 });
  });
});

describe("terminal profiles", () => {
  it("reads launch profiles by the names people type", () => {
    expect(resolveLaunchProfile("PowerShell")).toBe("pwsh");
    expect(resolveLaunchProfile("cmd")).toBe("cmd");
    expect(resolveLaunchProfile("wsl")).toBe("linux");
    expect(resolveLaunchProfile("zsh")).toBeNull();
    expect(resolveLaunchProfile(7)).toBeNull();
  });

  it("falls back to PowerShell for unknown ids", () => {
    expect(getTerminalProfile("nope").name).toBe("PowerShell");
  });
});
