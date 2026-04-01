declare module "v86" {
  export interface V86ImageLike {
    url?: string;
    buffer?: ArrayBuffer;
    async?: boolean;
    size?: number;
  }

  export interface V86StarterOptions {
    autostart?: boolean;
    memory_size?: number;
    vga_memory_size?: number;
    screen_container?: HTMLElement;
    bios?: V86ImageLike;
    vga_bios?: V86ImageLike;
    cdrom?: V86ImageLike;
    hda?: V86ImageLike;
    fda?: V86ImageLike;
    initial_state?: V86ImageLike;
  }

  export class V86 {
    constructor(options: V86StarterOptions);
    add_listener(event: string, listener: (...args: any[]) => void): void;
    remove_listener(event: string, listener: (...args: any[]) => void): void;
    destroy(): void;
    run(): Promise<void>;
    stop(): Promise<void>;
    restart(): void;
    save_state(): Promise<ArrayBuffer>;
    restore_state(state: ArrayBuffer): Promise<void>;
    screen_set_scale(scaleX: number, scaleY: number): void;
    screen_go_fullscreen(): void;
    keyboard_send_text(text: string): void;
  }
}
