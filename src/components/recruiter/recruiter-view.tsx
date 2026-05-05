import { useEffect } from "react";
import { Link } from "react-router-dom";
import { portfolioBuilt } from "@/data/portfolio-built";
import { classicPortfolio } from "@/data/classic-portfolio";
import {
  getResumeDownloadUrls,
  landingCopy,
  profile,
  repoUrl,
  socialLinks,
} from "@/data/portfolio";
import { resolvePublicAssetUrl } from "@/lib/assets";
import { SafeImage } from "@/components/ui/safe-image";
import { LogoMark } from "@/components/ui/logo-mark";
import styles from "@/components/recruiter/recruiter-view.module.css";

const workGallery = [
  {
    id: "vivus-202505",
    title: "Vivus - acquisition hero (2025)",
    detail: "Hero concept for a loan brand campaign. Layout, hierarchy, and export-ready assets.",
    src: resolvePublicAssetUrl("assets/Work/Vivus_hero_202505.jpg"),
  },
  {
    id: "vivus-mx",
    title: "Vivus - Mexico market variant",
    detail: "Localized version of the same brand system. Composition and layout adapted for the market.",
    src: resolvePublicAssetUrl("assets/Work/Vivus_om_mx_Hero.jpg"),
  },
  {
    id: "sol-rem-1",
    title: "Solar panel brand - promo hero",
    detail: "Landing and email hero visual. Typography, product framing, and CTA contrast.",
    src: resolvePublicAssetUrl("assets/Work/Sol_Rem_1.png"),
  },
  {
    id: "group-22",
    title: "Fintech email - hero + module set",
    detail: "Modular layout built for email-safe rendering. Layout system and CTA hierarchy.",
    src: resolvePublicAssetUrl("assets/Work/Group 22.png"),
  },
  {
    id: "group-16",
    title: "Campaign hero - high contrast variant",
    detail: "Hero focused on legibility and urgency. Layout and color pass.",
    src: resolvePublicAssetUrl("assets/Work/Group 16.png"),
  },
  {
    id: "group-1",
    title: "Campaign hero - lifestyle framing",
    detail: "Alternative hero with stronger lifestyle context. Composition and copy placement.",
    src: resolvePublicAssetUrl("assets/Work/Group 1.png"),
  },
  {
    id: "group-17",
    title: "Mascot campaign - hero direction",
    detail: "Mascot-led hero with a mini UI card. Balancing brand personality with a clear message.",
    src: resolvePublicAssetUrl("assets/Work/Group 17.png"),
  },
];

export function RecruiterView() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${profile.name} - Portfolio`;
    document.body.classList.add("recruiter-scroll");
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("recruiter-scroll");
    };
  }, []);

  const primaryCv = getResumeDownloadUrls()[0];
  const [leadProject, ...supportingProjects] = classicPortfolio.projects;
  const [spotlightWork, ...galleryWork] = workGallery;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <aside className={styles.heroRail}>
            <div className={styles.brandBlock}>
              <LogoMark size={56} color="rgba(255,255,255,0.95)" className={styles.logoMark} />
              <p className={styles.eyebrow}>Portfolio dossier / {profile.location}</p>
              <p className={styles.role}>{profile.role}</p>
              <p className={styles.railSummary}>{profile.availability}</p>
            </div>

            <dl className={styles.proofStrip}>
              {classicPortfolio.proof.map((item) => (
                <div key={item.label} className={styles.proofItem}>
                  <dt>{item.label}</dt>
                  <dd>{item.text}</dd>
                </div>
              ))}
            </dl>

            <div className={styles.quickNote}>
              <p className={styles.eyebrow}>Fast path</p>
              <p>
                Scan the first three projects, download the CV, then open the OS only if you want the implementation
                depth and architecture story.
              </p>
            </div>
          </aside>

          <div className={styles.heroMain}>
            <p className={styles.heroKicker}>Frontend design-to-code, campaign systems, and product-minded UI work.</p>
            <h1 className={styles.heroName}>{profile.name}</h1>
            <p className={styles.heroStatement}>
              Clear interfaces, strong hierarchy, and working React code when the idea needs to ship.
            </p>
            <p className={styles.heroLead}>{classicPortfolio.home.headline}</p>
            <p className={styles.heroBody}>{classicPortfolio.home.intro}</p>
            <p className={styles.heroBody}>{landingCopy.valueStatement}</p>

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

            <div className={styles.heroHighlights}>
              <article className={styles.featureCard}>
                <div className={styles.featureImage}>
                  <SafeImage src={leadProject.hero} alt={leadProject.heroAlt} loading="eager" />
                </div>
                <div className={styles.featureBody}>
                  <p className={styles.eyebrow}>{leadProject.kicker}</p>
                  <h2>{leadProject.title}</h2>
                  <p>{leadProject.oneLiner}</p>
                </div>
              </article>

              <div className={styles.miniColumn}>
                {supportingProjects.map((project) => (
                  <article key={project.id} className={styles.miniCard}>
                    <div className={styles.miniImage}>
                      <SafeImage src={project.hero} alt={project.heroAlt} />
                    </div>
                    <div className={styles.miniBody}>
                      <p className={styles.eyebrow}>{project.kicker}</p>
                      <h3>{project.title}</h3>
                    </div>
                  </article>
                ))}

                <div className={styles.lensPanel}>
                  <p className={styles.eyebrow}>What this proves</p>
                  <ul className={styles.lensList}>
                    <li>Visual campaign work with strong hierarchy and CTA clarity.</li>
                    <li>Frontend execution in React and TypeScript, not just static mockups.</li>
                    <li>A portfolio shell that behaves like a product, not a screenshot gallery.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="selected-work-heading">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{classicPortfolio.featured.eyebrow}</p>
            <h2 id="selected-work-heading">Recent work with the clearest signal.</h2>
            <p className={styles.sectionIntro}>
              Three recent directions: one hero-led finance campaign, one speed-focused acquisition layout, and one
              mascot-led concept that still keeps the offer legible.
            </p>
          </div>

          <div className={styles.selectedGrid}>
            {classicPortfolio.projects.map((project, index) => (
              <article
                key={project.id}
                className={`${styles.selectedCard} ${index === 0 ? styles.selectedCardPrimary : ""}`}
              >
                <div className={styles.selectedImage}>
                  <SafeImage src={project.hero} alt={project.heroAlt} loading={index === 0 ? "eager" : "lazy"} />
                </div>
                <div className={styles.selectedBody}>
                  <p className={styles.eyebrow}>{project.kicker}</p>
                  <h3>{project.title}</h3>
                  <p>{project.oneLiner}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="gallery-heading">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{classicPortfolio.work.eyebrow}</p>
            <h2 id="gallery-heading">A broader campaign gallery across markets.</h2>
            <p className={styles.sectionIntro}>
              Not every piece needs a case study. This gallery shows range: market variants, promo heroes, email-safe
              modules, and sharper visual directions.
            </p>
          </div>

          <div className={styles.galleryGrid}>
            <article className={`${styles.galleryCard} ${styles.galleryCardPrimary}`}>
              <div className={styles.galleryImage}>
                <SafeImage src={spotlightWork.src} alt={spotlightWork.title} loading="eager" />
              </div>
              <div className={styles.galleryBody}>
                <p className={styles.eyebrow}>Campaign visual</p>
                <h3>{spotlightWork.title}</h3>
                <p>{spotlightWork.detail}</p>
              </div>
            </article>

            {galleryWork.map((item) => (
              <article key={item.id} className={styles.galleryCard}>
                <div className={styles.galleryImage}>
                  <SafeImage src={item.src} alt={item.title} />
                </div>
                <div className={styles.galleryBody}>
                  <p className={styles.eyebrow}>Campaign visual</p>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="systems-heading">
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Build and approach</p>
            <h2 id="systems-heading">The visuals are one side. The system thinking is the other.</h2>
            <p className={styles.sectionIntro}>
              This path exists for fast review, but the OS itself is the stronger proof: state, routing, persistence,
              app launching, and a more product-like interaction model than a normal portfolio page.
            </p>
          </div>

          <div className={styles.systemsGrid}>
            <article className={`${styles.panel} ${styles.panelAccent}`}>
              <p className={styles.eyebrow}>Portfolio OS</p>
              <h3>{portfolioBuilt.headline}</h3>
              <p className={styles.panelText}>{portfolioBuilt.architectureSummary}</p>

              <div className={styles.actions}>
                <Link className={styles.secondaryBtn} to="/">
                  Open the OS
                </Link>
                <a className={styles.secondaryBtn} href={repoUrl} target="_blank" rel="noreferrer">
                  View source
                </a>
              </div>

              <p className={styles.eyebrow}>Stack</p>
              <div className={styles.stack}>
                {portfolioBuilt.stack.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>

              <p className={styles.eyebrow}>Key decisions</p>
              <ul className={styles.builtList}>
                {portfolioBuilt.decisions.map((decision) => (
                  <li key={decision}>{decision}</li>
                ))}
              </ul>
            </article>

            <article className={styles.panel}>
              <p className={styles.eyebrow}>{classicPortfolio.tools.eyebrow}</p>
              <h3>{classicPortfolio.tools.title}</h3>
              <p className={styles.panelText}>{classicPortfolio.tools.text}</p>
              <div className={styles.toolGrid}>
                {classicPortfolio.tools.items.map((tool) => (
                  <div key={tool.name} className={styles.toolItem}>
                    <img src={tool.icon} alt="" width={36} height={36} />
                    <span>{tool.name}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.panel}>
              <p className={styles.eyebrow}>{classicPortfolio.about.eyebrow}</p>
              <h3>{classicPortfolio.about.title}</h3>
              <p className={styles.panelText}>{classicPortfolio.about.intro}</p>
              <div className={styles.splitCopy}>
                <div>
                  <p className={styles.copyLabel}>{classicPortfolio.about.focusHeading}</p>
                  <p>{classicPortfolio.about.focus}</p>
                </div>
                <div>
                  <p className={styles.copyLabel}>{classicPortfolio.about.approachHeading}</p>
                  <p>{classicPortfolio.about.approach}</p>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className={`${styles.section} ${styles.contactSection}`} aria-labelledby="contact-heading">
          <div className={styles.contactLayout}>
            <div>
              <p className={styles.eyebrow}>Contact</p>
              <h2 id="contact-heading">Available for junior and mid-level frontend roles.</h2>
              <p className={styles.sectionIntro}>
                Best first step is email. If you want the implementation detail first, open the OS and read the case
                study inside the shell.
              </p>
            </div>

            <div className={styles.contactActions}>
              <a className={styles.primaryBtn} href={profile.email}>
                {profile.emailText}
              </a>
              <a className={styles.secondaryBtn} href={profile.phone}>
                {profile.phoneText}
              </a>
            </div>

            <div className={styles.footerLinks}>
              {socialLinks.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
