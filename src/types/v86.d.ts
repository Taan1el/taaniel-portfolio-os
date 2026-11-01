declare module "v86" {
  export interface V86ImageLike {
    url?: string;
    buffer?: ArrayBuffer;
    async?: boolean;
    size?: number;
  }

  export interface V86StarterOptions {
    autostart?: boolean;
    wasm_path?: string;
    memory_size?: number;
    vga_memory_size?: number;
    screen_container?: HTMLElement;
    bios?: V86ImageLike;
    vga_bios?: V86ImageLike;
    cdrom?: V86ImageLike;
    hda?: V86ImageLike;
    fda?: V86ImageLike;
    initial_state?: V86ImageLike;
    /** Presence alone adds the 9p device the bundled Linux mounts at /mnt. */
    filesystem?: { baseurl?: string; basefs?: string };
  }

  /** The browser audio output; absent where Web Audio is unavailable or the speaker is disabled. */
  export interface V86SpeakerAdapter {
    mixer?: {
      /** Linear gain; channel 0 is left, 1 right, 2 (default) both. */
      set_volume(value: number, channel?: number): void;
    };
  }

  export class V86 {
    constructor(options: V86StarterOptions);
    speaker_adapter?: V86SpeakerAdapter | null;
    /** Only there when `filesystem` was passed. Paths start at the shared folder's root. */
    fs9p?: { read_dir(path: string): string[] | undefined };
    create_file(path: string, data: Uint8Array): Promise<void>;
    read_file(path: string): Promise<Uint8Array>;
    add_listener(event: string, listener: (...args: any[]) => void): void;
    remove_listener(event: string, listener: (...args: any[]) => void): void;
    destroy(): void;
    run(): Promise<void>;
    stop(): Promise<void>;
    restart(): void;
    keyboard_set_enabled(enabled: boolean): void;
    mouse_set_enabled?(enabled: boolean): void;
    save_state(): Promise<ArrayBuffer>;
    restore_state(state: ArrayBuffer): Promise<void>;
    screen_set_scale(scaleX: number, scaleY: number): void;
    screen_go_fullscreen(): void;
    keyboard_send_text(text: string): void;
    serial0_send(text: string): void;
  }
}
