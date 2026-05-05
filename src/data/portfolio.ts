import { resolvePublicAssetUrl } from "@/lib/assets";
import type { DesktopEntry, FeaturedProject, SocialLink, ThemePreset } from "@/types/system";

export const profile = {
  name: "Taaniel Vananurm",
  role: "Frontend developer (UI systems)",
  shortRole: "Frontend developer",
  location: "Tallinn, Estonia",
  headline: "I design and build web interfaces — marketing pages, campaign visuals, and frontend systems.",
  intro:
    "I ship responsive web UI and campaign designs. This portfolio is also a live code sample: a browser-based desktop built with React and TypeScript, with a window manager and a virtual filesystem you can browse.",
  current:
    "I design and ship marketing and campaign visuals in a team while building stronger frontend skills in React and TypeScript — this portfolio OS is the main proof of that.",
  availability: "Open to junior and mid-level frontend roles.",
  email: "mailto:Taaniel.vananurm@gmail.com",
  emailText: "Taaniel.vananurm@gmail.com",
  phone: "tel:+37258948814",
  phoneText: "+372 5894 8814",
};

export const landingCopy = {
  valueStatement:
    "The /simple page gives you a quick overview. The OS shell is a live React + TypeScript project you can explore in more depth.",
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
  { label: "Education", value: "Tallinn Polytechnic" },
  { label: "Work context", value: "Marketing and email campaign production" },
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
  {
    label: "Dribbble",
    url: "https://dribbble.com/taaniel-vananurm",
  },
];

export const featuredProjects: FeaturedProject[] = [
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
    hero: resolvePublicAssetUrl("assets/Work/Dineromon_hero_v2.png"),
    layouts: [resolvePublicAssetUrl("assets/Work/Group 22.png")],
    stack: ["Figma", "Photoshop", "Email layout systems"],
    problem:
      "Email campaigns have tight constraints (limited CSS support, small viewports, fast scanning). The goal was to make the 0% offer instantly understandable and guide users to one primary CTA.",
    technicalHighlights: [
      "Designed for email-safe layout constraints (clear hierarchy, reliable spacing, readable CTA).",
      "Built modular sections so content can be rearranged for different audiences without redesigning everything.",
      "Optimized contrast and typography for quick scanning on mobile.",
    ],
    challengesAndTradeoffs:
      "Email-safe layouts limit advanced styling and interactivity. The design leans on typography, spacing, and contrast rather than complex effects.",
    whatILearned:
      "The fastest-performing campaign visuals are usually the simplest: one message, one CTA, and consistent spacing rules across modules.",
    screenshots: [
      resolvePublicAssetUrl("assets/Work/Dineromon_hero_v2.png"),
      resolvePublicAssetUrl("assets/Work/Group 22.png"),
    ],
    measurableOutcome: "NDA-safe: shipped as a production campaign hero + template used for rollout variants.",
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
    hero: resolvePublicAssetUrl("assets/Work/Credito365_2605.jpg"),
    layouts: [resolvePublicAssetUrl("assets/Work/Group 1.png")],
    stack: ["Figma", "Photoshop", "Marketing design"],
    problem:
      "Communicate a high-friction financial offer quickly and credibly: speed promise, clear CTA, and a layout that can be reused across variants.",
    technicalHighlights: [
      "Hero template supports multiple market/copy variants without breaking the hierarchy.",
      "CTA placement and spacing tuned for readability across common email/landing breakpoints.",
      "Visual cues (timing, context) reinforce the offer without overwhelming the layout.",
    ],
    challengesAndTradeoffs:
      "Urgency can hurt trust in finance categories. The design uses cleaner composition and consistent spacing to avoid a noisy 'spammy' look.",
    whatILearned:
      "In finance, trust signals (clean layout, readable CTA, balanced contrast) matter as much as the offer itself.",
    screenshots: [resolvePublicAssetUrl("assets/Work/Credito365_2605.jpg"), resolvePublicAssetUrl("assets/Work/Group 1.png")],
    measurableOutcome: "Shipped as a reusable hero direction + template for campaign iterations.",
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
    hero: resolvePublicAssetUrl("assets/Work/Cozmo_2605.jpg"),
    layouts: [resolvePublicAssetUrl("assets/Work/Group 17.png")],
    stack: ["Figma", "Illustrator", "Campaign systems"],
    problem:
      "The mascot creates attention, but the offer still needs to be understood instantly. The goal was to balance personality with a structured message and CTA.",
    technicalHighlights: [
      "Mini UI card turns an abstract offer into a concrete, scannable block.",
      "Layout keeps the mascot secondary to the core message hierarchy.",
      "Template-ready structure supports quick campaign variations.",
    ],
    challengesAndTradeoffs:
      "Mascots can compete with the message. The layout intentionally constrains the mascot’s footprint so CTA and offer remain dominant.",
    whatILearned:
      "Brand personality performs best when it supports clarity, not when it becomes the main content.",
    screenshots: [resolvePublicAssetUrl("assets/Work/Cozmo_2605.jpg"), resolvePublicAssetUrl("assets/Work/Group 17.png")],
    measurableOutcome: "Shipped as a campaign hero variant aligned to the brand system.",
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
    externalUrl: "/simple",
    defaultGridPosition: { gridX: 1, gridY: 2 },
  },
];
