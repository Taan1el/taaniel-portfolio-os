import { resolvePublicAssetUrl } from "@/lib/assets";
import type { VirtualFile } from "@/types/system";

export const V86_BIOS_PATH = resolvePublicAssetUrl("assets/v86/seabios.bin");
export const V86_VGA_BIOS_PATH = resolvePublicAssetUrl("assets/v86/vgabios.bin");
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

export function resolveVirtualX86Drive(file: VirtualFile) {
  const extension = file.extension.toLowerCase();

  if (extension === "iso") {
    return "cdrom";
  }

  return (file.size ?? 0) > 0 && (file.size ?? 0) <= FLOPPY_IMAGE_LIMIT_BYTES ? "fda" : "hda";
}
