import { useEffect } from "react";
import { Link } from "react-router-dom";
import { portfolioBuilt } from "@/data/portfolio-built";
import { classicPortfolio } from "@/data/classic-portfolio";
import {
  featuredProjects,
  getResumeDownloadUrls,
  landingCopy,
  profile,
  socialLinks,
} from "@/data/portfolio";
import { SafeImage } from "@/components/ui/safe-image";
import styles from "@/components/recruiter/recruiter-view.module.css";

const LANDING_KEY = "portfolio-landing-dismissed";

const CLASSIC_PROJECT_IDS = new Set(["dineromon", "credito365", "cozmo"]);

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
            <Link className={styles.secondaryBtn} to="/">
              Open OS portfolio
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
            {featuredProjects.filter((project) => !CLASSIC_PROJECT_IDS.has(project.id)).map((project) => (
              <article key={project.id} className={styles.card}>
                <div className={styles.cardImage}>
                  <SafeImage src={project.hero} alt="" />
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.eyebrow}>{project.type}</p>
                  <h3>{project.title}</h3>
                  <p className={styles.meta}>{project.oneLiner}</p>
                  {project.problem ? (
                    <p className={styles.meta}>
                      <strong style={{ color: "var(--text-strong)" }}>Problem: </strong>
                      {project.problem}
                    </p>
                  ) : null}
                  {project.architecture?.length ? (
                    <ul className={styles.builtList}>
                      {project.architecture.map((block) => (
                        <li key={block.title}>
                          <strong style={{ color: "var(--text-strong)" }}>{block.title}: </strong>
                          {block.body}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {project.technicalHighlights?.length ? (
                    <ul className={styles.builtList}>
                      {project.technicalHighlights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className={styles.stack}>
                    {project.stack.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <div className={styles.links}>
                    {project.liveUrl ? (
                      <a href={project.liveUrl} target="_blank" rel="noreferrer">
                        Live demo
                      </a>
                    ) : null}
                    {project.repoUrl ? (
                      <a href={project.repoUrl} target="_blank" rel="noreferrer">
                        Source
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="built-heading">
          <h2 id="built-heading">{portfolioBuilt.headline}</h2>
          <p className={styles.meta}>{portfolioBuilt.architectureSummary}</p>
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
