import { socialLinks } from "@/data/portfolio";
import type { BrowserBookmark } from "@/lib/browser/types";

export const browserBookmarks: BrowserBookmark[] = [
  { label: "GitHub profile", url: "https://github.com/Taan1el" },
  { label: "Portfolio repo", url: "https://github.com/Taan1el/taaniel-portfolio-os" },
  { label: "Live portfolio", url: "https://taan1el.github.io/taaniel-portfolio-os/" },
  ...socialLinks,
];
