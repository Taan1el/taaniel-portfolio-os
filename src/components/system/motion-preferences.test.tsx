// @vitest-environment jsdom
import type { ReactNode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MotionPreferences } from "@/components/system/motion-preferences";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

const motionConfigProps = vi.hoisted(() => ({ latest: undefined as { reducedMotion?: string } | undefined }));

vi.mock("framer-motion", () => ({
  MotionConfig: ({ children, ...props }: { children: ReactNode; reducedMotion?: string }) => {
    motionConfigProps.latest = props;
    return <div data-testid="motion-config">{children}</div>;
  },
}));

beforeEach(() => {
  motionConfigProps.latest = undefined;
  useSystemSettingsStore.getState().resetSettings();
});

afterEach(() => {
  cleanup();
  useSystemSettingsStore.getState().resetSettings();
});

describe("MotionPreferences", () => {
  it("follows the operating system until the setting is on", () => {
    render(
      <MotionPreferences>
        <span>child</span>
      </MotionPreferences>
    );

    expect(motionConfigProps.latest?.reducedMotion).toBe("user");
    expect(screen.getByText("child")).toBeTruthy();
  });

  it("always reduces motion once the visitor asks for it", () => {
    render(
      <MotionPreferences>
        <span>child</span>
      </MotionPreferences>
    );

    act(() => useSystemSettingsStore.getState().setReduceMotion(true));
    expect(motionConfigProps.latest?.reducedMotion).toBe("always");

    act(() => useSystemSettingsStore.getState().setReduceMotion(false));
    expect(motionConfigProps.latest?.reducedMotion).toBe("user");
  });
});
