import { useEffect, useRef, type RefObject } from "react";
import { attachMediaVolume, type MediaVolumeController } from "@/lib/master-volume";

/**
 * Plays an <audio> or <video> through the master volume from Quick Settings.
 *
 * `localVolume` is the app's own 0-1 slider (omit it for a player that only has
 * native controls, whose own mute and level are kept and scaled by the master).
 * `resetKey` changes whenever a different element is rendered, such as a new
 * track, so the volume is applied to the new one.
 */
export function useMasterVolume(
  ref: RefObject<HTMLMediaElement | null>,
  localVolume = 1,
  resetKey?: string | number | null
) {
  const localRef = useRef(localVolume);
  const controllerRef = useRef<MediaVolumeController | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const controller = attachMediaVolume(element, () => localRef.current);
    controllerRef.current = controller;

    return () => {
      controller.detach();
      controllerRef.current = null;
    };
  }, [ref, resetKey]);

  useEffect(() => {
    localRef.current = localVolume;
    controllerRef.current?.sync();
  }, [localVolume]);
}
