import { useEffect } from "react";
import { Link } from "react-router-dom";
import { portfolioBuilt } from "@/data/portfolio-built";
import { classicPortfolio } from "@/data/classic-portfolio";
import {
  getResumeDownloadUrls,
  landingCopy,
  liveDemoUrl,
  profile,
  repoUrl,
  socialLinks,
} from "@/data/portfolio";
import { SafeImage } from "@/components/ui/safe-image";
import styles from "@/components/recruiter/recruiter-view.module.css";

const LANDING_KEY = "portfolio-landing-dismissed";

const workGallery = [
  {
    id: "vivus-202505",
    title: "Vivus — acquisition hero (2025)",
    detail: "Hero concept shipped for a loan brand campaign. Contribution: layout + hierarchy + export-ready assets.",
    src: "/assets/Work/Vivus_hero_202505.jpg",
  },
  {
    id: "vivus-mx",
    title: "Vivus — Mexico market hero",
    detail: "Market variant for the same brand system. Contribution: composition tweaks + localized layout.",
    src: "/assets/Work/Vivus_om_mx_Hero.jpg",
  },
  {
    id: "sol-rem-1",
    title: "Solar panel brand — promo hero",
    detail: "Landing/email hero visual. Contribution: typography, product framing, and CTA contrast.",
    src: "/assets/Work/Sol_Rem_1.png",
  },
  {
    id: "group-22",
    title: "Fintech email layout — hero + module set",
    detail: "Modular layout designed for email-safe rendering. Contribution: layout system + CTA hierarchy.",
    src: "/assets/Work/Group 22.png",
  },
  {
    id: "group-16",
    title: "Campaign hero variant — high contrast",
    detail: "Hero exploration focusing on legibility and urgency. Contribution: layout + color/contrast pass.",
    src: "/assets/Work/Group 16.png",
  },
  {
    id: "group-1",
    title: "Campaign hero variant — lifestyle framing",
    detail: "Alternative hero approach with stronger lifestyle context. Contribution: composition + copy placement.",
    src: "/assets/Work/Group 1.png",
  },
  {
    id: "group-17",
    title: "Mascot campaign — hero direction",
    detail: "Mascot-led hero variant with mini UI card. Contribution: balancing personality with clarity.",
    src: "/assets/Work/Group 17.png",
  },
];

export function RecruiterView() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${profile.name} · Portfolio`;
    document.body.classList.add("recruiter-scroll");
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("recruiter-scroll");
    };
  }, []);

  const primaryCv = getResumeDownloadUrls()[0];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Quick portfolio · static site content + full case list</p>
          <h1>{profile.name}</h1>
          <p className={styles.role}>{classicPortfolio.home.eyebrow}</p>
          <p className={styles.lead} style={{ fontSize: "1.15rem", color: "var(--text-strong)" }}>
            {classicPortfolio.home.headline}
          </p>
          <p className={styles.lead}>{classicPortfolio.home.intro}</p>
          <p className={styles.lead}>{landingCopy.valueStatement}</p>
          <div className={styles.actions}>
            <a className={styles.primaryBtn} href={primaryCv} download>
              Download CV
            </a>
            <a className={styles.secondaryBtn} href={profile.email}>
              Contact me
            </a>
            <a className={styles.secondaryBtn} href={liveDemoUrl} target="_blank" rel="noreferrer">
              Live demo
            </a>
            <a className={styles.secondaryBtn} href={repoUrl} target="_blank" rel="noreferrer">
              GitHub repo
            </a>
          </div>

          <dl className={styles.proofStrip}>
            {classicPortfolio.proof.map((item) => (
              <div key={item.label} className={styles.proofItem}>
                <dt>{item.label}</dt>
                <dd>{item.text}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className={styles.section} aria-labelledby="classic-work-heading">
          <p className={styles.eyebrow}>{classicPortfolio.featured.eyebrow}</p>
          <h2 id="classic-work-heading">{classicPortfolio.featured.title}</h2>
          <div className={styles.classicFeatured}>
            {classicPortfolio.projects.map((project) => (
              <article key={project.id} className={styles.classicCard}>
                <div className={styles.classicCardImage}>
                  <SafeImage src={project.hero} alt={project.heroAlt} />
                </div>
                <div className={styles.classicCardBody}>
                  <p className={styles.eyebrow}>{project.kicker}</p>
                  <h3>{project.title}</h3>
                  <p className={styles.meta}>{project.oneLiner}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="tools-heading">
          <p className={styles.eyebrow}>{classicPortfolio.tools.eyebrow}</p>
          <h2 id="tools-heading">{classicPortfolio.tools.title}</h2>
          <p className={styles.meta}>{classicPortfolio.tools.text}</p>
          <div className={styles.toolGrid}>
            {classicPortfolio.tools.items.map((tool) => (
              <div key={tool.name} className={styles.toolItem}>
                <img src={tool.icon} alt="" width={36} height={36} />
                <span>{tool.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="projects-heading">
          <p className={styles.eyebrow}>{classicPortfolio.work.eyebrow}</p>
          <h2 id="projects-heading">{classicPortfolio.work.title}</h2>
          <p className={styles.meta}>{classicPortfolio.work.intro}</p>
          <div className={styles.grid} style={{ marginTop: "1.25rem" }}>
            {workGallery.map((item) => (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardImage}>
                  <SafeImage src={item.src} alt={item.title} />
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.eyebrow}>Hero visual</p>
                  <h3>{item.title}</h3>
                  <p className={styles.meta}>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="built-heading">
          <h2 id="built-heading">{portfolioBuilt.headline}</h2>
          <p className={styles.meta}>{portfolioBuilt.architectureSummary}</p>
          <p className={styles.meta} style={{ marginTop: "0.75rem" }}>
            In the OS version, open <strong style={{ color: "var(--text-strong)" }}>OS Case Study.md</strong> on the desktop for a
            quick architecture walkthrough.
          </p>
          <div className={styles.actions} style={{ marginTop: "0.9rem" }}>
            <a className={styles.secondaryBtn} href={liveDemoUrl} target="_blank" rel="noreferrer">
              Open OS case study
            </a>
          </div>
          <p className={styles.eyebrow} style={{ marginTop: "1rem" }}>
            Stack
          </p>
          <div className={styles.stack}>
            {portfolioBuilt.stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p className={styles.eyebrow} style={{ marginTop: "1rem" }}>
            Engineering decisions
          </p>
          <ul className={styles.builtList}>
            {portfolioBuilt.decisions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="about-heading">
          <p className={styles.eyebrow}>{classicPortfolio.about.eyebrow}</p>
          <h2 id="about-heading">{classicPortfolio.about.title}</h2>
          <p className={styles.meta}>{classicPortfolio.about.intro}</p>
          <p className={styles.meta} style={{ marginTop: "1rem" }}>
            <strong style={{ color: "var(--text-strong)" }}>{classicPortfolio.about.focusHeading}: </strong>
            {classicPortfolio.about.focus}
          </p>
          <p className={styles.meta}>
            <strong style={{ color: "var(--text-strong)" }}>{classicPortfolio.about.approachHeading}: </strong>
            {classicPortfolio.about.approach}
          </p>
          <p className={styles.meta} style={{ marginTop: "0.75rem" }}>
            {profile.availability}
          </p>
        </section>

        <section className={styles.section} aria-labelledby="contact-heading">
          <h2 id="contact-heading">Contact</h2>
          <p className={styles.meta}>
            <a href={profile.email}>{profile.emailText}</a>
            {" · "}
            <a href={profile.phone}>{profile.phoneText}</a>
            {" · "}
            {profile.location}
          </p>
          <div className={styles.footerLinks}>
            {socialLinks.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
          <p style={{ marginTop: "1.25rem" }}>
            <button
              type="button"
              className={styles.mutedLink}
              onClick={() => {
                localStorage.removeItem(LANDING_KEY);
              }}
            >
              Reset desktop welcome overlay
            </button>
          </p>
        </section>
      </div>
    </div>
  );
}
