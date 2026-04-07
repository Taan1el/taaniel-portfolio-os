import { resolvePublicAssetUrl } from "@/lib/assets";
import type { DesktopEntry, FeaturedProject, SocialLink, ThemePreset } from "@/types/system";

export const profile = {
  name: "Taaniel Vananurm",
  role: "Frontend developer (UI systems)",
  shortRole: "Frontend developer",
  location: "Tallinn, Estonia",
  headline: "I build interfaces in React and TypeScript—from marketing sites to interactive UI systems like this desktop shell.",
  intro:
    "I ship responsive web UI, email-safe layouts, and component-driven prototypes. This portfolio is also a technical sample: a browser desktop with windows, state, and a virtual filesystem so you can inspect how I structure frontend code—not just static case study pages.",
  current:
    "Studying at Tallinn Polytechnic; professionally I work on marketing assets and email campaign production while growing depth in frontend engineering.",
  availability: "Open to junior–mid frontend roles and UI-engineering internships.",
  email: "mailto:Taaniel.vananurm@gmail.com",
  emailText: "Taaniel.vananurm@gmail.com",
  phone: "tel:+37258948814",
  phoneText: "+372 5894 8814",
};

export const landingCopy = {
  valueStatement:
    "You get a fast, scannable profile on /simple, plus an interactive React + TypeScript shell when you want to go deeper.",
};

/** Primary CV URL (served from /public). Add a mirror if the main host blocks PDF fetch. */
export const resumePdfPath = resolvePublicAssetUrl("assets/Taaniel-Vananurm-CV.pdf");

/** Optional absolute URL (e.g. GitHub raw). Tried in the PDF viewer if the primary URL fails. */
export const resumePdfFallbackUrl: string | null = null;

export function getResumeDownloadUrls(): string[] {
  const urls = [resumePdfPath];
  if (resumePdfFallbackUrl) {
    urls.push(resumePdfFallbackUrl);
  }
  return urls;
}

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
  { label: "Focus", value: "Web UI, design-to-code, portfolio systems" },
  { label: "Education", value: "Tallinn Polytechnic" },
  { label: "Work context", value: "Marketing & email campaign production" },
  { label: "Proof in this repo", value: "Window manager, FS, lazy apps" },
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
  {
    label: "Dribbble",
    url: "https://dribbble.com/taaniel-vananurm",
  },
];

const osPortfolioScreens = [
  resolvePublicAssetUrl("assets/os-portfolio-hero.svg"),
];

export const featuredProjects: FeaturedProject[] = [
  {
    id: "portfolio-os",
    title: "Browser-Based Desktop OS Portfolio",
    type: "Frontend system / portfolio",
    oneLiner: "Built a full desktop-like environment in the browser using React and TypeScript.",
    role: "Solo — design and implementation",
    problem:
      "Recruiters need credible frontend signal quickly, but a conventional scroll-only portfolio hides systems thinking. I needed one surface that is both easy to scan and deep enough to inspect.",
    challenge:
      "Balance novelty with usability: keep the OS metaphor without trapping people who only have thirty seconds.",
    outcome:
      "A dual-mode presentation: a static fast path (/simple) plus an interactive shell that demonstrates state, lazy loading, and persistence.",
    measurableOutcome:
      "Initial JS stays split across lazy routes; heavy apps load on demand (measured via network panel on cold load).",
    hero: resolvePublicAssetUrl("assets/os-portfolio-hero.svg"),
    layouts: osPortfolioScreens,
    stack: ["React", "TypeScript", "Zustand", "IndexedDB", "pdf.js", "Vite", "Framer Motion"],
    architecture: [
      {
        title: "Window system",
        body: "react-rnd-backed windows with drag, resize, z-index stacking, minimize/maximize, and viewport clamping.",
      },
      {
        title: "State management",
        body: "Zustand stores for windows, processes, filesystem, and shell chrome; shallow subscriptions to limit rerenders.",
      },
      {
        title: "App registry",
        body: "Central registry maps app ids to lazy React modules so viewers and games are not in the critical path bundle.",
      },
      {
        title: "Virtual filesystem",
        body: "Tree of virtual nodes seeded with portfolio content; user files persist in IndexedDB via idb-keyval.",
      },
    ],
    technicalHighlights: [
      "Lazy-loaded app modules per `AppId`",
      "IndexedDB persistence for FS + desktop layout",
      "xterm-based terminal wired to portfolio commands",
      "Optional Hugging Face–backed semantic search in the shell",
    ],
    challengesAndTradeoffs:
      "A desktop UX is unfamiliar on the web, so I added onboarding, keyboard shortcuts, and a recruiter route without stripping the differentiator. Full a11y for every nested app is ongoing; core chrome now exposes focusable controls and labels.",
    whatILearned:
      "Treating the portfolio as a product surface forces clearer boundaries between shell, apps, and data—and makes tradeoffs (bundle size vs features) very concrete.",
    screenshots: osPortfolioScreens,
    liveUrl: undefined,
    repoUrl: "https://github.com/Taan1el/taaniel-portfolio-os",
  },
  {
    id: "realtime-dashboard",
    title: "Real-time operations dashboard",
    type: "Product UI (planned)",
    oneLiner: "Live KPI tiles and drill-down panels for a small operations team—placeholder scope for an upcoming build.",
    role: "Frontend owner (planned)",
    problem:
      "Stakeholders refresh spreadsheets for numbers that already exist in APIs; latency and layout noise hide anomalies.",
    challenge:
      "Show trustworthy live data with sane empty/loading/error states on mid-tier mobile hardware.",
    outcome:
      "Target: sub-second perceived updates on Wi‑Fi, readable density on 1280px, and accessible color-independent status cues.",
    measurableOutcome: "Estimated: 40–60% fewer ‘status check’ messages once tiles are trusted (to validate with users).",
    hero: resolvePublicAssetUrl("assets/Real-time_operations_dashboard.png"),
    layouts: [],
    stack: ["React", "TypeScript", "REST or WebSocket", "TanStack Query (planned)", "CSS modules"],
    technicalHighlights: [
      "Server-driven filters with optimistic UI where safe",
      "Virtualized list for alert stream",
      "Role-based column visibility",
    ],
    challengesAndTradeoffs:
      "Polling vs sockets: start with polling + backoff for simplicity; move to WS when SLA requires it.",
    whatILearned: "Placeholder — will document instrumentation and API contracts after build.",
    liveUrl: undefined,
    repoUrl: undefined,
  },
  {
    id: "form-workflow-ui",
    title: "Form builder / workflow UI",
    type: "Workflow tool (planned)",
    oneLiner: "Drag-and-drop steps with validation preview for an internal approvals flow—placeholder scope.",
    role: "Frontend owner (planned)",
    problem:
      "Ops teams edit JSON to change simple approval flows; mistakes ship to production.",
    challenge:
      "Make branching readable, validate early, and keep authored graphs exportable for the backend executor.",
    outcome:
      "Target: non-developers publish a draft flow in under five minutes with zero invalid graphs.",
    measurableOutcome: "Estimated: cut flow change requests to engineering by half once self-serve editor ships.",
    hero: resolvePublicAssetUrl("assets/Form_builder_workflow_UI.png"),
    layouts: [],
    stack: ["React", "TypeScript", "Zod (planned)", "Canvas or SVG graph (TBD)"],
    technicalHighlights: [
      "Schema-backed graph model shared with API",
      "Step inspector with inline validation",
      "JSON import/export for migrations",
    ],
    challengesAndTradeoffs:
      "Custom graph UI vs adopting a diagram library: optimize for maintainability and bundle size once requirements stabilize.",
    whatILearned: "Placeholder — will capture usability test notes after first prototype.",
    liveUrl: undefined,
    repoUrl: undefined,
  },
  {
    id: "dineromon",
    title: "Fintech Email Campaign (0% Offer)",
    type: "Email campaign",
    oneLiner:
      "I designed a focused hero banner and modular email layout that makes the 0% offer obvious and leads to a single CTA.",
    role: "Team member — design",
    challenge:
      "Communicate the offer instantly while balancing conversion clarity, trust, and campaign personality inside an email-safe layout.",
    outcome:
      "Delivered a high-contrast hero treatment and readable content structure that keeps the value proposition visible through the click.",
    hero: resolvePublicAssetUrl("assets/Dineromon_hero_v2.png"),
    layouts: [resolvePublicAssetUrl("assets/Group 22.png")],
    stack: ["Figma", "Photoshop", "Email layout systems"],
  },
  {
    id: "credito365",
    title: "Fast-Loan Hero + Template",
    type: "Hero + template",
    oneLiner:
      "I built a speed-led visual concept that highlights a 10-minute claim and gives the campaign a stronger shopping context.",
    role: "Team member — design",
    challenge:
      "Push urgency without making the visual system feel noisy or untrustworthy in a high-friction financial category.",
    outcome:
      "Created a campaign direction that highlights timing, keeps the CTA readable, and supports acquisition and sign-up flows.",
    hero: resolvePublicAssetUrl("assets/Credito365_2605.jpg"),
    layouts: [resolvePublicAssetUrl("assets/Group 1.png")],
    stack: ["Figma", "Photoshop", "Marketing design"],
  },
  {
    id: "cozmo",
    title: "Mascot-Driven Email Campaign",
    type: "Brand campaign",
    oneLiner:
      "I combined a mascot-led hero with a mini UI card so the offer becomes understandable at a glance.",
    role: "Team member — design",
    challenge: "Translate brand personality into a performance-oriented email that still explains the offer quickly.",
    outcome:
      "Shipped a more memorable campaign visual with enough structure to keep the financial message clear and actionable.",
    hero: resolvePublicAssetUrl("assets/Cozmo_2605.jpg"),
    layouts: [resolvePublicAssetUrl("assets/Group 17.png")],
    stack: ["Figma", "Illustrator", "Campaign systems"],
  },
];

export const photographyAssets = [
  { title: "Alps or the Dolomites", src: resolvePublicAssetUrl("assets/Alps_or_the_Dolomites_canon.jpg") },
  { title: "Austria Mountains", src: resolvePublicAssetUrl("assets/austria_mountains_canon.jpg") },
  { title: "Blush of Spring", src: resolvePublicAssetUrl("assets/Blush_of_Spring_canon.jpg") },
  { title: "Clouds", src: resolvePublicAssetUrl("assets/Clouds.jpg") },
  { title: "Flower", src: resolvePublicAssetUrl("assets/flower.jpg") },
  { title: "Flower in Austria", src: resolvePublicAssetUrl("assets/flower_in_austria_canon.jpg") },
  { title: "Flowers in a Field", src: resolvePublicAssetUrl("assets/Flowers_in_a_field_canon.jpg") },
  { title: "Flowers", src: resolvePublicAssetUrl("assets/flowers.jpg") },
  { title: "Golden Wave", src: resolvePublicAssetUrl("assets/Golden_Wave_canon.jpg") },
  { title: "Mountains", src: resolvePublicAssetUrl("assets/mountains.jpg") },
  { title: "Mushrooms", src: resolvePublicAssetUrl("assets/mushrooms.jpg") },
  { title: "The Red Cap", src: resolvePublicAssetUrl("assets/The_Red_Cap_canon.jpg") },
];

export const themePresets: ThemePreset[] = [
  {
    id: "cloud-archive",
    name: "Cloud Archive",
    wallpaper:
      `linear-gradient(rgba(6, 12, 20, 0.52), rgba(6, 12, 20, 0.78)), url('${resolvePublicAssetUrl("assets/Clouds.jpg")}') center/cover no-repeat`,
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
      `linear-gradient(rgba(6, 12, 20, 0.5), rgba(6, 12, 20, 0.78)), url('${resolvePublicAssetUrl("assets/austria_mountains_canon.jpg")}') center/cover no-repeat`,
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
    id: "lab-folder",
    label: "Lab",
    type: "folder",
    directoryPath: "/Users/Public/Lab",
    defaultGridPosition: { gridX: 1, gridY: 1 },
  },
];
