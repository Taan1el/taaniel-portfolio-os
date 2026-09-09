import { resolvePublicAssetUrl } from "@/lib/assets";
import { profile } from "@/data/portfolio";

export const classicPortfolio = {
  home: {
    headline: "Websites, interfaces, and campaign design.",
    intro: profile.intro,
  },
  proof: [
    { label: "Education", text: profile.education },
    { label: "Experience", text: profile.current },
    { label: "Next role", text: profile.availability },
  ],
  featured: { eyebrow: "Selected work", title: "Web projects" },
  tools: {
    eyebrow: "Tools",
    title: "Design and development",
    text: "HTML, CSS, and JavaScript in Slow Pour; React and TypeScript in Portfolio OS. Figma and Photoshop for design work.",
    items: [
      { name: "Figma", icon: resolvePublicAssetUrl("assets/icons/figma.svg") },
      { name: "Photoshop", icon: resolvePublicAssetUrl("assets/icons/photoshop.svg") },
      { name: "HTML", icon: resolvePublicAssetUrl("assets/icons/html5.svg") },
      { name: "CSS", icon: resolvePublicAssetUrl("assets/icons/css3.svg") },
      { name: "JavaScript", icon: resolvePublicAssetUrl("assets/icons/javascript.svg") },
    ],
  },
  about: {
    eyebrow: "About",
    title: "From multimedia studies to web projects",
    intro: profile.education,
    focusHeading: "Focus",
    focus: "Junior frontend development, web design, and digital design, including visual material for marketing.",
    approachHeading: "Approach",
    approach: "I work on page structure, readable layouts, and the interactions needed to turn a design into a working website.",
  },
  work: {
    eyebrow: "Internship",
    title: "Fiizy OÜ",
    dates: "3 March–19 June 2026",
    intro: "I designed and coded HTML/CSS email banners and campaign visuals, working across different markets with international financial-product partners.",
    outcome: "I contributed campaign materials that supported financial products reaching millions of people. This describes the wider campaign context, not a measured result attributable to my work.",
    confidentiality: "Partner identities, campaign assets, internal figures, and performance results are not included here. The work is described without a public demo or source repository.",
  },
};
