import { resolvePublicAssetUrl } from "@/lib/assets";
import { SNAPSHOTS_DIRECTORY_PATH } from "@/lib/system-workspace";
import { getBaseName } from "@/lib/utils";
import type { VirtualFile } from "@/types/system";

export const V86_BIOS_PATH = resolvePublicAssetUrl("assets/v86/seabios.bin");
export const V86_VGA_BIOS_PATH = resolvePublicAssetUrl("assets/v86/vgabios.bin");
export const V86_TEXT_CELL_WIDTH = 9;
export const V86_TEXT_CELL_HEIGHT = 16;

const FLOPPY_IMAGE_LIMIT_BYTES = 2_949_120;

export function getVirtualX86SnapshotPath(filePath: string) {
  const baseName = getBaseName(filePath).replace(/\.[^.]+$/, "");
  return `${SNAPSHOTS_DIRECTORY_PATH}/${baseName}.v86state`;
}

export async function sourceToArrayBuffer(source: string) {
  const response = await fetch(source);

  if (!response.ok) {
    throw new Error(`Failed to load binary data from ${source}.`);
  }

  return response.arrayBuffer();
}

export async function arrayBufferToDataUrl(buffer: ArrayBuffer, mimeType: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to encode the emulator state."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(new Blob([buffer], { type: mimeType }));
  });
}

export function resolveVirtualX86Drive(file: VirtualFile) {
  const extension = file.extension.toLowerCase();

  if (extension === "iso") {
    return "cdrom";
  }

  return (file.size ?? 0) > 0 && (file.size ?? 0) <= FLOPPY_IMAGE_LIMIT_BYTES ? "fda" : "hda";
}

export function resolveVirtualX86ViewportSize(width: number, height: number, bpp: number) {
  const contentWidth = bpp === 0 ? width * V86_TEXT_CELL_WIDTH : width;
  const contentHeight = bpp === 0 ? height * V86_TEXT_CELL_HEIGHT : height;

  return {
    contentWidth,
    contentHeight,
    frameWidth: contentWidth + 72,
    frameHeight: contentHeight + 148,
  };
}

export function getVirtualX86StatusLabel(status: string, hasDisk: boolean) {
  if (!hasDisk) {
    return "Import an .img or .iso in Explorer, then open it to boot the emulator.";
  }

  return status;
}
