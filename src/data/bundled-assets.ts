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
    source: resolvePublicAssetUrl("assets/Black Star.mp3"),
  },
  {
    path: "/Media/Music/Black Star Cover.jpg",
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/blackstar_img.jpg"),
  },
  {
    path: "/Media/Music/American Psycho.mp3",
    extension: "mp3",
    mimeType: "audio/mpeg",
    source: resolvePublicAssetUrl("assets/American Psycho.mp3"),
  },
  {
    path: "/Media/Music/American Psycho Cover.jpg",
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/american psycho icon.jpg"),
  },
  {
    path: "/Media/Music/Life's Too Short.mp3",
    extension: "mp3",
    mimeType: "audio/mpeg",
    source: resolvePublicAssetUrl("assets/Life's Too Short.mp3"),
  },
  {
    path: "/Media/Music/Life's Too Short Cover.jpg",
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/Life's Too Short icon.jpg"),
  },
  {
    path: "/Media/Music/Self Aware.mp3",
    extension: "mp3",
    mimeType: "audio/mpeg",
    source: resolvePublicAssetUrl("assets/Self Aware.mp3"),
  },
];

export const bundledPortfolioAssets: BundledReadonlyFileAsset[] = [
  {
    path: `${PORTFOLIO_WORKBENCH_PATH}/files.zip`,
    extension: "zip",
    mimeType: "application/zip",
    source: resolvePublicAssetUrl("assets/files.zip"),
  },
  {
    path: `${PORTFOLIO_WORKBENCH_PATH}/Group 16.png`,
    extension: "png",
    mimeType: "image/png",
    source: resolvePublicAssetUrl("assets/Group 16.png"),
  },
  {
    path: `${PORTFOLIO_WORKBENCH_PATH}/Sol Rem 1.png`,
    extension: "png",
    mimeType: "image/png",
    source: resolvePublicAssetUrl("assets/Sol_Rem_1.png"),
  },
  {
    path: `${PORTFOLIO_WORKBENCH_PATH}/Vivus Hero 202505.jpg`,
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/Vivus_hero_202505.jpg"),
  },
  {
    path: `${PORTFOLIO_WORKBENCH_PATH}/Vivus OM MX Hero.jpg`,
    extension: "jpg",
    mimeType: "image/jpeg",
    source: resolvePublicAssetUrl("assets/Vivus_om_mx_Hero.jpg"),
  },
];

export const bundledGameAssets: BundledReadonlyFileAsset[] = [
  {
    path: "/Games/Doom Logo.png",
    extension: "png",
    mimeType: "image/png",
    source: resolvePublicAssetUrl("assets/doom_logo.png"),
  },
];

export const bundledWorkspaceDirectories = [PORTFOLIO_WORKBENCH_PATH] as const;

export const bundledWorkspaceAssets: BundledReadonlyFileAsset[] = [
  ...bundledMusicLibrary,
  ...bundledPortfolioAssets,
  ...bundledGameAssets,
];
