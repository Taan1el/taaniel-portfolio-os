/**
 * English copy and structure mirrored from the static site at Desktop/taaniel-portfolio (content.js).
 * Used on /simple so the quick portfolio matches that portfolio’s voice and sections.
 */
import { resolvePublicAssetUrl } from "@/lib/assets";

export const classicPortfolio = {
  home: {
    eyebrow: "Web designer and developer",
    headline: "I design & code websites.",
    intro:
      "I build landing pages, websites, and visuals that move quickly from idea to code. Right now I'm studying at Tallinn Polytechnic and working as an intern at Fiizy OÜ.",
  },
  proof: [
    { label: "Currently", text: "Studying at Tallinn Polytechnic." },
    { label: "Internship", text: "Working in a team at Fiizy OÜ." },
    { label: "Focus", text: "Landing pages, websites, and brand visuals." },
  ],
  featured: {
    eyebrow: "Selected work",
    title: "My 3 most recent works.",
  },
  projects: [
    {
      id: "dineromon",
      kicker: "Email campaign",
      title: "Fintech email campaign (0% offer)",
      oneLiner:
        "Team-designed a hero banner and modular email layout that highlights a 0% offer with clear hierarchy and a single, strong CTA.",
      hero: resolvePublicAssetUrl("assets/Dineromon_hero_v2.png"),
      heroAlt:
        "Red-background hero with a large 0% interest message, pill CTA button, and a smiling person holding shopping bags.",
    },
    {
      id: "credito365",
      kicker: "Hero + template",
      title: "Fast-loan email hero + template",
      oneLiner:
        "Designed as a team member a speed-focused hero (10 minutes) with lifestyle context to drive loan applications and sign-ups.",
      hero: resolvePublicAssetUrl("assets/Credito365_2605.jpg"),
      heroAlt:
        "Hero visual emphasizing getting money in 10 minutes, a CTA button, and a shopping context.",
    },
    {
      id: "cozmo",
      kicker: "Mascot campaign",
      title: "Mascot-driven email campaign",
      oneLiner:
        "Team-designed a personality-rich hero that combines the campaign promise with a mini-UI card for instant clarity.",
      hero: resolvePublicAssetUrl("assets/Cozmo_2605.jpg"),
      heroAlt:
        "Hero visual with mascot, an offer up to 30,000 pesos, and a mini UI card showing amount and term.",
    },
  ],
  tools: {
    eyebrow: "Tool stack",
    title: "The tools I usually design and build with.",
    text: "Figma, Adobe, and front-end tools that help me move quickly from concept to a working result.",
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
      "I'm a web designer and developer creating landing pages, websites, and brand visuals from idea to code. I'm studying at Tallinn Polytechnic and doing my internship at Fiizy OÜ, where I work on marketing and email visuals in a team.",
    focusHeading: "What I do",
    focus:
      "I design and build landing pages, websites, and campaign visuals where the message needs to be immediate and credible.",
    approachHeading: "How I work",
    approach: "I start from the goal, keep the composition clean, and move the design into code quickly.",
  },
  work: {
    eyebrow: "Extended case studies",
    title: "Systems, experiments, and more work.",
    intro: "Below: the browser OS portfolio build, roadmap projects, and the same campaigns in a longer case-study format.",
  },
};
