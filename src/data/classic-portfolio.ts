/**
 * English copy and structure mirrored from the static site at Desktop/taaniel-portfolio (content.js).
 * Used on /portfolio so the quick portfolio matches that portfolio's voice and sections.
 */
import { resolvePublicAssetUrl } from "@/lib/assets";

export const classicPortfolio = {
  home: {
    eyebrow: "Frontend developer (UI systems)",
    headline: "I build web interfaces in React + TypeScript.",
    intro:
      "I design and build landing pages, websites, and campaign visuals from idea to working code. I recently completed a Fiizy OÜ internship and am deepening my frontend skills in React and TypeScript.",
  },
  proof: [
    { label: "Education", text: "Multimedia specialist, graduated with honours from Tallinn Polytechnic." },
    { label: "Focus", text: "Landing pages, web UI, and reusable design components." },
    { label: "Also", text: "React + TypeScript frontend development — this portfolio OS is the proof." },
  ],
  featured: {
    eyebrow: "Selected work",
    title: "Campaign work from Fiizy OÜ.",
  },
  projects: [
    {
      id: "dineromon",
      kicker: "Email campaign",
      title: "Fintech email campaign (0% offer)",
      oneLiner:
        "Designed a hero banner and modular email layout that makes the 0% offer clear at a glance, with a single strong CTA.",
      hero: resolvePublicAssetUrl("assets/Work/Dineromon_hero_v2.png"),
      heroAlt:
        "Red-background hero with a large 0% interest message, pill CTA button, and a smiling person holding shopping bags.",
    },
    {
      id: "credito365",
      kicker: "Hero + template",
      title: "Fast-loan email hero + template",
      oneLiner:
        "Designed a speed-focused hero highlighting a 10-minute promise with lifestyle context to drive loan applications.",
      hero: resolvePublicAssetUrl("assets/Work/Credito365_2605.jpg"),
      heroAlt:
        "Hero visual emphasizing getting money in 10 minutes, a CTA button, and a shopping context.",
    },
    {
      id: "cozmo",
      kicker: "Mascot campaign",
      title: "Mascot-driven email campaign",
      oneLiner:
        "Combined a mascot-led hero with a mini UI card so the offer is clear and the brand personality comes through.",
      hero: resolvePublicAssetUrl("assets/Work/Cozmo_2605.jpg"),
      heroAlt:
        "Hero visual with mascot, an offer up to 30,000 pesos, and a mini UI card showing amount and term.",
    },
  ],
  tools: {
    eyebrow: "Tool stack",
    title: "Tools I design and build with.",
    text: "Figma, Adobe tools, and frontend code — the combination that lets me go from concept to a working result quickly.",
    items: [
      { name: "Figma", icon: resolvePublicAssetUrl("assets/icons/figma.svg") },
      { name: "Photoshop", icon: resolvePublicAssetUrl("assets/icons/photoshop.svg") },
      { name: "Illustrator", icon: resolvePublicAssetUrl("assets/icons/illustrator.svg") },
      { name: "WordPress", icon: resolvePublicAssetUrl("assets/icons/wordpress.svg") },
      { name: "HTML5", icon: resolvePublicAssetUrl("assets/icons/html5.svg") },
      { name: "CSS3", icon: resolvePublicAssetUrl("assets/icons/css3.svg") },
      { name: "JavaScript", icon: resolvePublicAssetUrl("assets/icons/javascript.svg") },
      { name: "VS Code", icon: resolvePublicAssetUrl("assets/icons/vscode.svg") },
    ],
  },
  about: {
    eyebrow: "About",
    title: "Clear design, strong hierarchy, and fast execution.",
    intro:
      "I'm a multimedia specialist and frontend developer based in Viimsi, Estonia. I build landing pages, websites, and campaign visuals from concept to code. I graduated with honours from Tallinn Polytechnic and completed a Fiizy OÜ internship, creating marketing and email campaign visuals for international finance partners.",
    focusHeading: "What I do",
    focus:
      "I design and build landing pages, websites, and campaign visuals where the message needs to be immediate and easy to understand.",
    approachHeading: "How I work",
    approach: "I start from the goal, keep the layout clean, and move the design into code quickly.",
  },
  work: {
    eyebrow: "More work",
    title: "Hero visuals shipped for different markets.",
    intro: "A selection of hero images and campaign layouts created for brands across different countries.",
  },
  workGallery: [
    {
      id: "vivus-202505",
      category: "Campaign hero",
      title: "Vivus — acquisition hero (2025)",
      detail: "Hero concept for a loan brand campaign. Layout, hierarchy, and export-ready assets.",
      src: resolvePublicAssetUrl("assets/Work/Vivus_hero_202505.jpg"),
    },
    {
      id: "vivus-mx",
      category: "Market variant",
      title: "Vivus — Mexico market variant",
      detail: "Localized version of the same brand system. Composition and layout adapted for the market.",
      src: resolvePublicAssetUrl("assets/Work/Vivus_om_mx_Hero.jpg"),
    },
    {
      id: "sol-rem-1",
      category: "Promo hero",
      title: "Solar panel brand — promo hero",
      detail: "Landing and email hero visual. Typography, product framing, and CTA contrast.",
      src: resolvePublicAssetUrl("assets/Work/Sol_Rem_1.png"),
    },
    {
      id: "group-22",
      category: "Email layout",
      title: "Fintech email — hero + module set",
      detail: "Modular layout built for email-safe rendering. Layout system and CTA hierarchy.",
      src: resolvePublicAssetUrl("assets/Work/Group 22.png"),
    },
    {
      id: "group-16",
      category: "Campaign hero",
      title: "Campaign hero — high contrast variant",
      detail: "Hero focused on legibility and urgency. Layout and color pass.",
      src: resolvePublicAssetUrl("assets/Work/Group 16.png"),
    },
    {
      id: "group-1",
      category: "Campaign hero",
      title: "Campaign hero — lifestyle framing",
      detail: "Alternative hero with stronger lifestyle context. Composition and copy placement.",
      src: resolvePublicAssetUrl("assets/Work/Group 1.png"),
    },
    {
      id: "group-17",
      category: "Mascot campaign",
      title: "Mascot campaign — hero direction",
      detail: "Mascot-led hero with a mini UI card. Balancing brand personality with a clear message.",
      src: resolvePublicAssetUrl("assets/Work/Group 17.png"),
    },
  ],
};
