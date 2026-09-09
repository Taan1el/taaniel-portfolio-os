import { resolvePublicAssetUrl } from "@/lib/assets";

export interface BundledReadonlyFileAsset {
  path: string;
  extension: string;
  mimeType: string;
  source: string;
}

export const PORTFOLIO_WORKBENCH_PATH = "/Portfolio/Workbench";

export const bundledMusicLibrary: BundledReadonlyFileAsset[] = [
  {
    path: "/Media/Music/Black Star.mp3",
    extension: "mp3",
    mimeType: "audio/mpeg",
    source: resolvePublicAssetUrl("assets/Music/Black Star.mp3"),
  },
  {
    path: "/Media/Music/Black Star Cover.jpg",
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/Music/blackstar_img.jpg"),
  },
  {
    path: "/Media/Music/American Psycho.mp3",
    extension: "mp3",
    mimeType: "audio/mpeg",
    source: resolvePublicAssetUrl("assets/Music/American Psycho.mp3"),
  },
  {
    path: "/Media/Music/American Psycho Cover.jpg",
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/Music/american psycho icon.jpg"),
  },
  {
    path: "/Media/Music/Life's Too Short.mp3",
    extension: "mp3",
    mimeType: "audio/mpeg",
    source: resolvePublicAssetUrl("assets/Music/Life's Too Short.mp3"),
  },
  {
    path: "/Media/Music/Life's Too Short Cover.jpg",
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/Music/Life's Too Short icon.jpg"),
  },
  {
    path: "/Media/Music/Self Aware.mp3",
    extension: "mp3",
    mimeType: "audio/mpeg",
    source: resolvePublicAssetUrl("assets/Music/Self Aware.mp3"),
  },
  {
    path: "/Media/Music/Self Aware Cover.jpg",
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/Music/Self_Aware_icon.jpg"),
  },
];

// Campaign files are withheld until publication permission is confirmed.
export const bundledPortfolioAssets: BundledReadonlyFileAsset[] = [];

export const bundledWorkspaceDirectories = [PORTFOLIO_WORKBENCH_PATH] as const;

export const bundledWorkspaceAssets: BundledReadonlyFileAsset[] = [
  ...bundledMusicLibrary,
  ...bundledPortfolioAssets,
];
