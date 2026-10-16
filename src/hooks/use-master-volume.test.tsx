// @vitest-environment jsdom
import { useRef } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useMasterVolume } from "@/hooks/use-master-volume";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

function Player({ local, trackKey }: { local?: number; trackKey?: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useMasterVolume(ref, local, trackKey);

  return <audio ref={ref} data-testid="audio" />;
}

const audio = (container: HTMLElement) => container.querySelector("audio")!;

beforeEach(() => {
  useSystemSettingsStore.getState().resetSettings();
});

afterEach(() => {
  cleanup();
  useSystemSettingsStore.getState().resetSettings();
});

describe("useMasterVolume", () => {
  it("applies the master volume when the player mounts", () => {
    useSystemSettingsStore.getState().setVolume(30);
    const { container } = render(<Player />);

    expect(audio(container).volume).toBeCloseTo(0.3, 5);
  });

  it("follows the master slider and mute", () => {
    const { container } = render(<Player />);

    act(() => useSystemSettingsStore.getState().setVolume(60));
    expect(audio(container).volume).toBeCloseTo(0.6, 5);

    act(() => useSystemSettingsStore.getState().setMuted(true));
    expect(audio(container).muted).toBe(true);

    act(() => useSystemSettingsStore.getState().setMuted(false));
    expect(audio(container).muted).toBe(false);
  });

  it("scales the player's own slider by the master", () => {
    useSystemSettingsStore.getState().setVolume(50);
    const { container, rerender } = render(<Player local={0.8} />);
    expect(audio(container).volume).toBeCloseTo(0.4, 5);

    rerender(<Player local={0.2} />);
    expect(audio(container).volume).toBeCloseTo(0.1, 5);
  });

  it("leaves a player at its own level when the master is untouched", () => {
    const { container } = render(<Player local={0.72} />);
    expect(audio(container).volume).toBeCloseTo(0.72, 5);
  });

  it("stops following after the player unmounts", () => {
    const { container, unmount } = render(<Player />);
    const element = audio(container);
    unmount();

    useSystemSettingsStore.getState().setVolume(5);
    expect(element.volume).toBe(1);
  });
});
