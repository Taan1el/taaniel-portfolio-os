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

const workGallery = [
  {
    id: "vivus-202505",
    title: "Vivus — acquisition hero (2025)",
    detail: "Hero concept for a loan brand campaign. Layout, hierarchy, and export-ready assets.",
    src: "/assets/Work/Vivus_hero_202505.jpg",
  },
  {
    id: "vivus-mx",
    title: "Vivus — Mexico market variant",
    detail: "Localized version of the same brand system. Composition and layout adapted for the market.",
    src: "/assets/Work/Vivus_om_mx_Hero.jpg",
  },
  {
    id: "sol-rem-1",
    title: "Solar panel brand — promo hero",
    detail: "Landing and email hero visual. Typography, product framing, and CTA contrast.",
    src: "/assets/Work/Sol_Rem_1.png",
  },
  {
    id: "group-22",
    title: "Fintech email — hero + module set",
    detail: "Modular layout built for email-safe rendering. Layout system and CTA hierarchy.",
    src: "/assets/Work/Group 22.png",
  },
  {
    id: "group-16",
    title: "Campaign hero — high contrast variant",
    detail: "Hero focused on legibility and urgency. Layout and color pass.",
    src: "/assets/Work/Group 16.png",
  },
  {
    id: "group-1",
    title: "Campaign hero — lifestyle framing",
    detail: "Alternative hero with stronger lifestyle context. Composition and copy placement.",
    src: "/assets/Work/Group 1.png",
  },
  {
    id: "group-17",
    title: "Mascot campaign — hero direction",
    detail: "Mascot-led hero with a mini UI card. Balancing brand personality with a clear message.",
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
          <p className={styles.eyebrow}>Portfolio · {profile.location}</p>
          <h1>{profile.name}</h1>
          <p className={styles.role}>{profile.role}</p>
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
            <a className={styles.secondaryBtn} href={repoUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <Link className={styles.secondaryBtn} to="/">
              Open OS
            </Link>
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
                  <p className={styles.eyebrow}>Campaign visual</p>
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
            Open <strong style={{ color: "var(--text-strong)" }}>OS Case Study.md</strong> on the desktop for a full walkthrough of the architecture and decisions.
          </p>
          <div className={styles.actions} style={{ marginTop: "0.9rem" }}>
            <a className={styles.secondaryBtn} href={liveDemoUrl} target="_blank" rel="noreferrer">
              Open the OS
            </a>
            <a className={styles.secondaryBtn} href={repoUrl} target="_blank" rel="noreferrer">
              View source on GitHub
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
            Key decisions
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
          <p className={styles.meta} style={{ marginTop: "0.35rem" }}>
            Best: email. Typical response time: within 24 hours.
          </p>
          <div className={styles.footerLinks}>
            {socialLinks.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
