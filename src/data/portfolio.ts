import { resolvePublicAssetUrl } from "@/lib/assets";
import type { DesktopEntry, FeaturedProject, SocialLink, ThemePreset } from "@/types/system";

export const profile = {
  name: "Taaniel Vananurm",
  role: "Junior frontend developer and web designer",
  shortRole: "Junior frontend developer",
  location: "Tallinn, Estonia",
  headline: "Web design, frontend development, and campaign visuals.",
  intro:
    "I'm a multimedia graduate based in Tallinn. My projects include a coffee shop website and this React and TypeScript portfolio, with draggable windows and a browser-local filesystem.",
  current:
    "During my Fiizy OÜ internship (3 March–19 June 2026), I designed and coded HTML/CSS email banners and campaign visuals for different markets.",
  availability: "Seeking junior frontend, web design and digital design roles.",
  education: "Tallinn Polytechnic: Multimedia Specialist, level 4, 2023–2026. Graduated with honours.",
  email: "mailto:Taaniel.vananurm@gmail.com",
  emailText: "Taaniel.vananurm@gmail.com",
  phone: "tel:+37258948814",
  phoneText: "+372 5894 8814",
};

export const landingCopy = {
  valueStatement:
    "A focused portfolio overview is one click away. The OS shell is a live React + TypeScript project you can explore in more depth.",
};

/** Primary CV URL (served from /public). Add a mirror if the main host blocks PDF fetch. */
export const resumePdfPath = resolvePublicAssetUrl("assets/CV_Taaniel_Vananurm.pdf");

/** Optional absolute URL (e.g. GitHub raw). Tried in the PDF viewer if the primary URL fails. */
export const resumePdfFallbackUrl: string | null = null;

export function getResumeDownloadUrls(): string[] {
  const urls = [resumePdfPath];
  if (resumePdfFallbackUrl) {
    urls.push(resumePdfFallbackUrl);
  }
  return urls;
}

export const liveDemoUrl = "https://taan1el.github.io/taaniel-portfolio-os/";
export const repoUrl = "https://github.com/Taan1el/taaniel-portfolio-os";

export const skills = [
  "React",
  "TypeScript",
  "JavaScript",
  "HTML / CSS",
  "Responsive UI",
  "Figma",
  "Email HTML",
  "Component architecture",
  "Zustand",
  "Vite",
];

export const quickStats = [
  { label: "Focus", value: "Web UI, campaign design, design-to-code" },
  { label: "Education", value: "Multimedia Specialist, level 4, 2023–2026; graduated with honours" },
  { label: "Experience", value: "Fiizy OÜ internship, 3 March–19 June 2026" },
  { label: "This portfolio OS", value: "React + TypeScript, window manager, virtual filesystem" },
];

export const socialLinks: SocialLink[] = [
  {
    label: "GitHub",
    url: "https://github.com/Taan1el",
  },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/taaniel-vananurm-1a203b3bb/",
  },
  {
    label: "Instagram",
    url: "https://www.instagram.com/taaniel.vananurm/",
  },
  {
    label: "Unsplash",
    url: "https://unsplash.com/@taanielv",
  },
];

export const featuredProjects: FeaturedProject[] = [
  {
    id: "slow-pour",
    title: "Slow Pour",
    type: "Multimedia final exam",
    oneLiner: "A coffee shop website with a product catalogue, filtering, and a browser-local shopping cart.",
    role: "Student project: web design, frontend implementation, and a separate backend module.",
    problem: "Present a coffee range and let visitors browse products and try an order flow on desktop and mobile.",
    challenge: "Keep the static demo usable while separating it from features that need a server.",
    outcome: "A public front-end demo on GitHub Pages. Products load from JSON; cart state stays in localStorage. Forms simulate submission, not real orders or email delivery.",
    hero: resolvePublicAssetUrl("assets/projects/slow-pour.png"),
    heroAlt: "Slow Pour home page with Estonian navigation, a coffee cup, and a link to browse coffees.",
    layouts: [],
    stack: ["Nunjucks", "JavaScript", "CSS", "Vite", "Express", "SQLite"],
    technicalHighlights: [
      "Module 3 builds Nunjucks templates into static pages, with JavaScript filtering and cart interactions.",
      "Module 4 contains an Express server, Nunjucks views, SQLite storage, and contact and admin routes.",
    ],
    challengesAndTradeoffs: "GitHub Pages serves only the front-end demo. The Express backend and SQLite database require a separate server and do not run on GitHub Pages.",
    liveUrl: "https://taan1el.github.io/Multimeedia_eksam/",
    repoUrl: "https://github.com/Taan1el/Multimeedia_eksam",
  },
  {
    id: "portfolio-os",
    title: "Portfolio OS",
    type: "Interactive frontend",
    oneLiner: "A browser-based desktop with a conventional portfolio page for a quicker overview.",
    role: "Personal portfolio project: interface design and frontend implementation.",
    problem: "Show working frontend code without making employers navigate a desktop interface to find projects or contact details.",
    challenge: "Coordinate windows, application state, and browser-local files while keeping a direct portfolio route.",
    outcome: "A React and TypeScript application with draggable and resizable windows, a virtual filesystem, and a separate /portfolio page.",
    hero: resolvePublicAssetUrl("assets/projects/portfolio-os.png"),
    heroAlt: "Portfolio OS desktop with application windows and taskbar.",
    layouts: [],
    stack: ["React", "TypeScript", "Zustand", "IndexedDB", "Vite", "Vitest"],
    technicalHighlights: [
      "Separate stores manage windows, processes, and the virtual filesystem.",
      "App modules use dynamic imports; browser-local files are persisted with IndexedDB.",
    ],
    challengesAndTradeoffs: "This is a desktop-style web application, not an operating system. Local files belong to the browser's storage and can be lost if that storage is cleared.",
    liveUrl: liveDemoUrl,
    repoUrl,
  },
];

export const photographyAssets = [
  { title: "Alps or the Dolomites", src: resolvePublicAssetUrl("assets/Photography/Alps_or_the_Dolomites_canon.jpg") },
  { title: "Austria Mountains", src: resolvePublicAssetUrl("assets/Photography/austria_mountains_canon.jpg") },
  { title: "Blush of Spring", src: resolvePublicAssetUrl("assets/Photography/Blush_of_Spring_canon.jpg") },
  { title: "Clouds", src: resolvePublicAssetUrl("assets/Photography/Clouds.jpg") },
  { title: "Flower", src: resolvePublicAssetUrl("assets/Photography/flower.jpg") },
  { title: "Flower in Austria", src: resolvePublicAssetUrl("assets/Photography/flower_in_austria_canon.jpg") },
  { title: "Flowers in a Field", src: resolvePublicAssetUrl("assets/Photography/Flowers_in_a_field_canon.jpg") },
  { title: "Flowers", src: resolvePublicAssetUrl("assets/Photography/flowers.jpg") },
  { title: "Golden Wave", src: resolvePublicAssetUrl("assets/Photography/Golden_Wave_canon.jpg") },
  { title: "Mountains", src: resolvePublicAssetUrl("assets/Photography/mountains.jpg") },
  { title: "Mushrooms", src: resolvePublicAssetUrl("assets/Photography/mushrooms.jpg") },
  { title: "The Red Cap", src: resolvePublicAssetUrl("assets/Photography/The_Red_Cap_canon.jpg") },
];

export const themePresets: ThemePreset[] = [
  {
    id: "cloud-archive",
    name: "Cloud Archive",
    wallpaper:
      `linear-gradient(rgba(6, 12, 20, 0.52), rgba(6, 12, 20, 0.78)), url('${resolvePublicAssetUrl("assets/Photography/Clouds.jpg")}') center/cover no-repeat`,
    desktopTint: "rgba(6, 11, 21, 0.62)",
    glow: "rgba(153, 209, 255, 0.36)",
    shell: "rgba(5, 10, 17, 0.8)",
    accent: "#77c7ff",
  },
  {
    id: "ember-grid",
    name: "Ember Grid",
    wallpaper:
      "radial-gradient(circle at 12% 20%, rgba(255, 133, 71, 0.24), transparent 24%), radial-gradient(circle at 80% 75%, rgba(235, 220, 157, 0.18), transparent 26%), linear-gradient(160deg, #120d13 0%, #25182a 48%, #4f3127 100%)",
    desktopTint: "rgba(15, 10, 14, 0.66)",
    glow: "rgba(255, 188, 112, 0.34)",
    shell: "rgba(24, 15, 20, 0.82)",
    accent: "#ffb26a",
  },
  {
    id: "alpine-slate",
    name: "Alpine Slate",
    wallpaper:
      `linear-gradient(rgba(6, 12, 20, 0.5), rgba(6, 12, 20, 0.78)), url('${resolvePublicAssetUrl("assets/Photography/austria_mountains_canon.jpg")}') center/cover no-repeat`,
    desktopTint: "rgba(8, 13, 22, 0.6)",
    glow: "rgba(151, 196, 255, 0.34)",
    shell: "rgba(8, 14, 24, 0.84)",
    accent: "#7db1ff",
  },
];

export const desktopEntries: DesktopEntry[] = [
  {
    id: "about-app",
    label: "About",
    type: "app",
    appId: "about",
    defaultGridPosition: { gridX: 0, gridY: 0 },
  },
  {
    id: "projects-app",
    label: "Projects",
    type: "app",
    appId: "projects",
    defaultGridPosition: { gridX: 0, gridY: 1 },
  },
  {
    id: "contact-app",
    label: "Contact",
    type: "app",
    appId: "contact",
    defaultGridPosition: { gridX: 0, gridY: 2 },
  },
  {
    id: "resume-file",
    label: "Resume.pdf",
    type: "file",
    filePath: "/Documents/Taaniel-Vananurm-CV.pdf",
    defaultGridPosition: { gridX: 1, gridY: 0 },
  },
  {
    id: "os-case-study",
    label: "OS Case Study.md",
    type: "file",
    filePath: "/Portfolio/OS-Case-Study.md",
    defaultGridPosition: { gridX: 2, gridY: 0 },
  },
  {
    id: "photos-app",
    label: "Photos",
    type: "app",
    appId: "photos",
    defaultGridPosition: { gridX: 1, gridY: 1 },
  },
  {
    id: "simple-portfolio",
    label: "Portfolio",
    type: "link",
    externalUrl: "/portfolio",
    defaultGridPosition: { gridX: 1, gridY: 2 },
  },
  {
    id: "trash",
    label: "Trash",
    type: "folder",
    directoryPath: "/Trash",
    defaultGridPosition: { gridX: 2, gridY: 2 },
  },
];
