export interface DeviceDetail {
  label: string;
  value: string;
}

interface UserAgentData {
  brands?: Array<{ brand: string; version: string }>;
  platform?: string;
  mobile?: boolean;
}

export interface DeviceSource {
  navigator: Navigator & { deviceMemory?: number; userAgentData?: UserAgentData };
  screen: Pick<Screen, "width" | "height" | "colorDepth">;
  devicePixelRatio: number;
  gpu: string | null;
}

/** The GPU the browser reports through WebGL, or null where it hides or lacks it. */
export function readGpuRenderer(doc: Document): string | null {
  try {
    const gl = doc.createElement("canvas").getContext("webgl");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const value = gl && info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null;
    return typeof value === "string" && value ? value : null;
  } catch {
    return null;
  }
}

/** Real readings only. A value the browser does not give is left out, never made up. */
export function describeDevice(source: DeviceSource): DeviceDetail[] {
  const { navigator: nav, screen, devicePixelRatio } = source;
  const details: DeviceDetail[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value) details.push({ label, value });
  };
  const brands = nav.userAgentData?.brands?.filter((entry) => !/not.?a.?brand/i.test(entry.brand));

  add("Browser", brands?.length ? brands.map((entry) => `${entry.brand} ${entry.version}`).join(", ") : null);
  add("Platform", nav.userAgentData?.platform ?? nav.platform);
  add("Logical processors", nav.hardwareConcurrency ? String(nav.hardwareConcurrency) : null);
  // Browsers round and cap deviceMemory (8 means "8 GB or more").
  add("Device memory", typeof nav.deviceMemory === "number" ? `${nav.deviceMemory} GB or more (rounded by the browser)` : null);
  add("Screen", `${screen.width} x ${screen.height} at ${Math.round(devicePixelRatio * 100)}% scale, ${screen.colorDepth}-bit colour`);
  add("Graphics", source.gpu);
  add("Touch points", String(nav.maxTouchPoints ?? 0));
  add("Language", nav.language);
  add("User agent", nav.userAgent);

  return details;
}

export function describeUptime(milliseconds: number): string {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}
