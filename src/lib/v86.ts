import { resolvePublicAssetUrl } from "@/lib/assets";
import type { VirtualFile } from "@/types/system";

export const V86_BIOS_PATH = resolvePublicAssetUrl("assets/v86/seabios.bin");
export const V86_VGA_BIOS_PATH = resolvePublicAssetUrl("assets/v86/vgabios.bin");
export const V86_WASM_PATH = resolvePublicAssetUrl("assets/v86/v86.wasm");
const FLOPPY_IMAGE_LIMIT_BYTES = 2_949_120;
let v86RuntimePromise: Promise<typeof import("v86")> | null = null;

export function loadV86Runtime() {
  if (!v86RuntimePromise) {
    v86RuntimePromise = import("v86");
  }

  return v86RuntimePromise;
}

export async function sourceToArrayBuffer(source: string) {
  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(`Failed to load binary data from ${source}.`);
  }

  return response.arrayBuffer();
}

/** Keeps a file name usable in the shared folder, which has no subfolders from this side. */
export function sharedFileName(name: string) {
  return name.replace(/[/\\\u0000-\u001f]/g, "_").replace(/^\.+/, "_").slice(0, 120) || "file";
}

export function resolveVirtualX86Drive(file: VirtualFile) {
  const extension = file.extension.toLowerCase();

  if (extension === "iso") {
    return "cdrom";
  }

  return (file.size ?? 0) > 0 && (file.size ?? 0) <= FLOPPY_IMAGE_LIMIT_BYTES ? "fda" : "hda";
}
