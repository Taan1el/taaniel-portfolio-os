import type {
  DesktopWallpaperState,
  ImageWallpaperPreset,
  ThemePreset,
  WallpaperPreset,
} from "@/types/system";
import { photographyAssets } from "@/data/portfolio";

export const defaultDesktopWallpaper: DesktopWallpaperState = {
  mode: "theme",
  imageSource: null,
  presetId: null,
};

export const wallpaperPresets: WallpaperPreset[] = [
  {
    id: "studio-neon",
    name: "Studio Neon",
    mode: "gradient",
    preview:
      "radial-gradient(circle at 18% 20%, rgba(86, 216, 255, 0.34), transparent 28%), radial-gradient(circle at 82% 16%, rgba(255, 156, 109, 0.26), transparent 24%), linear-gradient(155deg, #09111c 0%, #0d1830 46%, #172848 100%)",
    background:
      "radial-gradient(circle at 18% 20%, rgba(86, 216, 255, 0.34), transparent 28%), radial-gradient(circle at 82% 16%, rgba(255, 156, 109, 0.26), transparent 24%), linear-gradient(155deg, #09111c 0%, #0d1830 46%, #172848 100%)",
    desktopTint: "rgba(8, 15, 26, 0.58)",
    glow: "rgba(96, 214, 255, 0.34)",
    shell: "rgba(8, 15, 24, 0.82)",
  },
  {
    id: "graphite-horizon",
    name: "Graphite Horizon",
    mode: "gradient",
    preview:
      "radial-gradient(circle at 20% 12%, rgba(255, 211, 127, 0.18), transparent 24%), radial-gradient(circle at 88% 72%, rgba(118, 175, 255, 0.18), transparent 24%), linear-gradient(160deg, #0a0e16 0%, #181e2c 45%, #263347 100%)",
    background:
      "radial-gradient(circle at 20% 12%, rgba(255, 211, 127, 0.18), transparent 24%), radial-gradient(circle at 88% 72%, rgba(118, 175, 255, 0.18), transparent 24%), linear-gradient(160deg, #0a0e16 0%, #181e2c 45%, #263347 100%)",
    desktopTint: "rgba(10, 14, 22, 0.62)",
    glow: "rgba(126, 184, 255, 0.26)",
    shell: "rgba(10, 14, 22, 0.84)",
  },
  {
    id: "amber-grid",
    name: "Amber Grid",
    mode: "gradient",
    preview:
      "radial-gradient(circle at 24% 18%, rgba(255, 171, 92, 0.22), transparent 26%), radial-gradient(circle at 76% 74%, rgba(255, 242, 164, 0.14), transparent 24%), linear-gradient(145deg, #130d12 0%, #261a24 48%, #4e3526 100%)",
    background:
      "radial-gradient(circle at 24% 18%, rgba(255, 171, 92, 0.22), transparent 26%), radial-gradient(circle at 76% 74%, rgba(255, 242, 164, 0.14), transparent 24%), linear-gradient(145deg, #130d12 0%, #261a24 48%, #4e3526 100%)",
    desktopTint: "rgba(16, 10, 14, 0.62)",
    glow: "rgba(255, 182, 108, 0.3)",
    shell: "rgba(20, 13, 18, 0.84)",
  },
  {
    id: "aurora-flow",
    name: "Aurora Flow",
    mode: "animated",
    preview:
      "radial-gradient(circle at 18% 22%, rgba(110, 243, 210, 0.28), transparent 24%), radial-gradient(circle at 78% 18%, rgba(126, 180, 255, 0.26), transparent 22%), linear-gradient(135deg, #071019 0%, #10213c 52%, #152d52 100%)",
    background:
      "radial-gradient(circle at 18% 22%, rgba(110, 243, 210, 0.28), transparent 24%), radial-gradient(circle at 78% 18%, rgba(126, 180, 255, 0.26), transparent 22%), linear-gradient(135deg, #071019 0%, #10213c 52%, #152d52 100%)",
    desktopTint: "rgba(7, 14, 24, 0.5)",
    glow: "rgba(111, 243, 210, 0.24)",
    shell: "rgba(7, 14, 24, 0.82)",
  },
  {
    id: "solar-drift",
    name: "Solar Drift",
    mode: "animated",
    preview:
      "radial-gradient(circle at 20% 18%, rgba(255, 160, 84, 0.28), transparent 24%), radial-gradient(circle at 82% 68%, rgba(255, 221, 124, 0.18), transparent 22%), linear-gradient(150deg, #150d12 0%, #2b1724 44%, #53312b 100%)",
    background:
      "radial-gradient(circle at 20% 18%, rgba(255, 160, 84, 0.28), transparent 24%), radial-gradient(circle at 82% 68%, rgba(255, 221, 124, 0.18), transparent 22%), linear-gradient(150deg, #150d12 0%, #2b1724 44%, #53312b 100%)",
    desktopTint: "rgba(18, 10, 14, 0.52)",
    glow: "rgba(255, 174, 109, 0.28)",
    shell: "rgba(18, 11, 16, 0.84)",
  },
];

export const gradientWallpaperPresets = wallpaperPresets.filter(
  (preset) => preset.mode === "gradient"
);

export const animatedWallpaperPresets = wallpaperPresets.filter(
  (preset) => preset.mode === "animated"
);

const imageWallpaperTitles = [
  "Clouds",
  "Austria Mountains",
  "Alps or the Dolomites",
  "Golden Wave",
  "Flowers in a Field",
  "The Red Cap",
];

export const imageWallpaperPresets: ImageWallpaperPreset[] = imageWallpaperTitles
  .map((title) => {
    const asset = photographyAssets.find((entry) => entry.title === title);

    if (!asset) {
      return null;
    }

    return {
      id: title.toLowerCase().replace(/[^\w]+/g, "-"),
      name: asset.title,
      source: asset.src,
      preview: asset.src,
    };
  })
  .filter((preset): preset is ImageWallpaperPreset => Boolean(preset));

export function getWallpaperPreset(presetId?: string | null) {
  return wallpaperPresets.find((preset) => preset.id === presetId) ?? null;
}

export function resolveDesktopWallpaper(
  theme: ThemePreset,
  wallpaper: DesktopWallpaperState
) {
  if (wallpaper.mode === "image" && wallpaper.imageSource) {
    return {
      background: `linear-gradient(rgba(6, 11, 18, 0.42), rgba(6, 11, 18, 0.74)), url('${wallpaper.imageSource}') center/cover no-repeat`,
      desktopTint: theme.desktopTint,
      glow: theme.glow,
      shell: theme.shell,
      animated: false,
    };
  }

  if (wallpaper.mode === "gradient" || wallpaper.mode === "animated") {
    const preset = getWallpaperPreset(wallpaper.presetId);

    if (preset && preset.mode === wallpaper.mode) {
      return {
        background: preset.background,
        desktopTint: preset.desktopTint ?? theme.desktopTint,
        glow: preset.glow ?? theme.glow,
        shell: preset.shell ?? theme.shell,
        animated: wallpaper.mode === "animated",
      };
    }
  }

  return {
    background: theme.wallpaper,
    desktopTint: theme.desktopTint,
    glow: theme.glow,
    shell: theme.shell,
    animated: false,
  };
}
