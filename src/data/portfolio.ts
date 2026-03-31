import { resolvePublicAssetUrl } from "@/lib/assets";
import type { DesktopEntry, FeaturedProject, SocialLink, ThemePreset } from "@/types/system";

export const profile = {
  name: "Taaniel Vananurm",
  role: "Frontend Designer and Developer",
  shortRole: "Frontend designer / developer",
  location: "Tallinn, Estonia",
  headline: "I turn portfolio content into product-grade interfaces people want to explore.",
  intro:
    "I design and build fast, polished experiences across landing pages, websites, email campaigns, and UI systems. This portfolio reframes that work as a browser desktop so recruiters can explore my thinking the same way they would explore a product.",
  current:
    "Currently studying at Tallinn Polytechnic and working in a team environment on marketing and email visuals.",
  availability:
    "Open to frontend, UI implementation, product design, and creative engineering opportunities.",
  email: "mailto:Taaniel.vananurm@gmail.com",
  emailText: "Taaniel.vananurm@gmail.com",
  phone: "tel:+37258948814",
  phoneText: "+372 5894 8814",
};

export const skills = [
  "React",
  "TypeScript",
  "JavaScript",
  "Figma",
  "HTML5",
  "CSS",
  "Responsive UI",
  "Email design",
  "Visual hierarchy",
  "Motion systems",
  "Design-to-code workflows",
  "Creative direction",
];

export const quickStats = [
  { label: "Current focus", value: "Landing pages, websites, portfolio systems" },
  { label: "Learning environment", value: "Tallinn Polytechnic" },
  { label: "Team context", value: "Marketing and email campaign production" },
  { label: "Specialty", value: "UI detail with implementation awareness" },
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
      "Designed a focused hero banner and modular email layout that makes the 0% offer obvious and drives to a single CTA.",
    role: "Team member (design)",
    challenge:
      "Communicate the offer instantly while balancing conversion clarity, trust, and campaign personality inside an email-safe layout.",
    outcome:
      "Produced a high-contrast hero treatment and readable content structure that keeps the value proposition visible all the way to click.",
    hero: resolvePublicAssetUrl("assets/Dineromon_hero_v2.png"),
    layouts: [resolvePublicAssetUrl("assets/Group 22.png")],
    stack: ["Figma", "Photoshop", "Email layout systems"],
  },
  {
    id: "credito365",
    title: "Fast-Loan Hero + Template",
    type: "Hero + template",
    oneLiner:
      "Built a speed-led visual concept that emphasizes a 10-minute claim and gives the campaign a stronger shopping context.",
    role: "Team member (design)",
    challenge:
      "Push urgency without making the visual system feel noisy or untrustworthy in a high-friction financial category.",
    outcome:
      "Created a campaign direction that highlights timing, keeps the CTA readable, and supports both acquisition and sign-up flows.",
    hero: resolvePublicAssetUrl("assets/Credito365_2605.jpg"),
    layouts: [resolvePublicAssetUrl("assets/Group 1.png")],
    stack: ["Figma", "Photoshop", "Marketing design"],
  },
  {
    id: "cozmo",
    title: "Mascot-Driven Email Campaign",
    type: "Brand campaign",
    oneLiner:
      "Combined a mascot-led hero with a mini UI card so the offer becomes understandable at a glance.",
    role: "Team member (design)",
    challenge:
      "Translate brand personality into a performance-oriented email that still explains the offer quickly.",
    outcome:
      "Delivered a more memorable campaign visual with enough structure to keep the financial message clear and actionable.",
    hero: resolvePublicAssetUrl("assets/Cozmo_2605.jpg"),
    layouts: [resolvePublicAssetUrl("assets/Group 17.png")],
    stack: ["Figma", "Illustrator", "Campaign systems"],
  },
];

export const photographyAssets = [
  { title: "Clouds", src: resolvePublicAssetUrl("assets/Clouds.jpg") },
  { title: "Flower", src: resolvePublicAssetUrl("assets/flower.jpg") },
  { title: "Flowers", src: resolvePublicAssetUrl("assets/flowers.jpg") },
  { title: "Mountains", src: resolvePublicAssetUrl("assets/mountains.jpg") },
  { title: "Mushrooms", src: resolvePublicAssetUrl("assets/mushrooms.jpg") },
];

export const resumePdfPath = resolvePublicAssetUrl("assets/Taaniel-Vananurm-CV.pdf");

export const themePresets: ThemePreset[] = [
  {
    id: "signal-dusk",
    name: "Signal Dusk",
    wallpaper:
      "radial-gradient(circle at 20% 20%, rgba(255, 133, 71, 0.28), transparent 34%), radial-gradient(circle at 82% 18%, rgba(106, 197, 255, 0.24), transparent 30%), linear-gradient(135deg, #071019 0%, #0d1a2d 42%, #11243f 100%)",
    desktopTint: "rgba(9, 18, 32, 0.66)",
    glow: "rgba(255, 141, 88, 0.42)",
    shell: "rgba(10, 16, 26, 0.82)",
    accent: "#ff8a5c",
  },
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
    id: "files-app",
    label: "Explorer",
    type: "app",
    appId: "files",
    defaultGridPosition: { gridX: 0, gridY: 3 },
  },
  {
    id: "resume-file",
    label: "Resume.pdf",
    type: "file",
    filePath: "/Documents/Taaniel-Vananurm-CV.pdf",
    defaultGridPosition: { gridX: 1, gridY: 0 },
  },
  {
    id: "welcome-file",
    label: "Welcome.md",
    type: "file",
    filePath: "/Desktop/Welcome.md",
    defaultGridPosition: { gridX: 1, gridY: 1 },
  },
  {
    id: "photo-folder",
    label: "Photography",
    type: "folder",
    directoryPath: "/Media/Photography",
    defaultGridPosition: { gridX: 1, gridY: 2 },
  },
  {
    id: "terminal-app",
    label: "Terminal",
    type: "app",
    appId: "terminal",
    defaultGridPosition: { gridX: 1, gridY: 3 },
  },
  {
    id: "browser-app",
    label: "Browser",
    type: "app",
    appId: "browser",
    defaultGridPosition: { gridX: 2, gridY: 3 },
  },
  {
    id: "blog-folder",
    label: "Blog",
    type: "folder",
    directoryPath: "/Users/Public/Blog",
    defaultGridPosition: { gridX: 2, gridY: 0 },
  },
  {
    id: "github-link",
    label: "GitHub",
    type: "link",
    externalUrl: "https://github.com/Taan1el",
    defaultGridPosition: { gridX: 2, gridY: 1 },
  },
  {
    id: "linkedin-link",
    label: "LinkedIn",
    type: "link",
    externalUrl: "https://www.linkedin.com/in/taaniel-vananurm-1a203b3bb/",
    defaultGridPosition: { gridX: 2, gridY: 2 },
  },
];
