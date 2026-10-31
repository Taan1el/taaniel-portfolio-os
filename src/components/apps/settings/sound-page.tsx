import { useState } from "react";
import { Speaker, Volume2 } from "lucide-react";
import { Button } from "@/components/apps/app-layout";
import {
  SettingsGroup,
  SettingsRow,
  SliderControl,
  ToggleSwitch,
} from "@/components/apps/settings/settings-controls";
import { VolumeIcon } from "@/components/shell/tray-glyphs";
import { getMasterGain } from "@/lib/master-volume";
import { resolveVolumeGlyph } from "@/lib/device-status";
import { playTestTone } from "@/lib/test-tone";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

export function SoundPage() {
  const volume = useSystemSettingsStore((state) => state.volume);
  const muted = useSystemSettingsStore((state) => state.muted);
  const setVolume = useSystemSettingsStore((state) => state.setVolume);
  const setMuted = useSystemSettingsStore((state) => state.setMuted);
  const [testUnavailable, setTestUnavailable] = useState(false);

  return (
    <>
      <SettingsGroup title="Output">
        <SettingsRow
          icon={<Speaker size={18} />}
          title="Speakers"
          description="Your device's sound output. The browser decides where it plays."
        />
        <SettingsRow
          icon={<VolumeIcon glyph={resolveVolumeGlyph(volume, muted)} size={18} />}
          settingId="volume"
          title="Volume"
          description="The master volume. Music, videos and the virtual x86 machine all play at this level."
        >
          <SliderControl
            label="Volume"
            value={volume}
            valueText={muted ? "Muted" : `${volume}%`}
            onChange={setVolume}
          />
        </SettingsRow>
        <SettingsRow settingId="mute" title="Mute" description="Silences every player until you turn it back on." className="is-nested">
          <ToggleSwitch label="Mute" checked={muted} onChange={setMuted} />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Test">
        <SettingsRow
          icon={<Volume2 size={18} />}
          settingId="test-speakers"
          title="Test your speakers"
          description={
            testUnavailable
              ? "This browser cannot play the test tone."
              : muted
                ? "Speakers are muted, so the tone will be silent."
                : "Plays a short tone at the current volume."
          }
        >
          <Button
            type="button"
            variant="panel"
            onClick={() => setTestUnavailable(!playTestTone(getMasterGain(volume, muted)))}
          >
            Play tone
          </Button>
        </SettingsRow>
      </SettingsGroup>
    </>
  );
}
