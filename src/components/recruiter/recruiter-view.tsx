import { useEffect } from "react";
import { Link } from "react-router-dom";
import { portfolioBuilt } from "@/data/portfolio-built";
import { classicPortfolio } from "@/data/classic-portfolio";
import {
  codeProjects,
  getResumeDownloadUrls,
  landingCopy,
  liveDemoUrl,
  profile,
  repoUrl,
  socialLinks,
} from "@/data/portfolio";
import { SafeImage } from "@/components/ui/safe-image";
import { LogoMark } from "@/components/ui/logo-mark";
import styles from "@/components/recruiter/recruiter-view.module.css";

const workGallery = classicPortfolio.workGallery;

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
          <LogoMark size={52} color="rgba(255,255,255,0.92)" className={styles.logoMark} />
          <p className={styles.eyebrow}>Portfolio · {profile.location}</p>
          <h1>{profile.name}</h1>
          <p className={styles.role}>{profile.role}</p>
          <p className={`${styles.lead} ${styles.leadStrong}`}>
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
          <div className={`${styles.grid} ${styles.gridSpaced}`}>
            {workGallery.map((item) => (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardImage}>
                  <SafeImage src={item.src} alt={item.title} />
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.eyebrow}>{item.category}</p>
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
          <p className={`${styles.meta} ${styles.metaSpaced}`}>
            Open <strong className={styles.strongText}>OS Case Study.md</strong> on the desktop for a full walkthrough of the architecture and decisions.
          </p>
          <div className={`${styles.actions} ${styles.actionsSpaced}`}>
            <a className={styles.secondaryBtn} href={liveDemoUrl} target="_blank" rel="noreferrer">
              Open the OS
            </a>
            <a className={styles.secondaryBtn} href={repoUrl} target="_blank" rel="noreferrer">
              View source on GitHub
            </a>
          </div>
          <p className={`${styles.eyebrow} ${styles.eyebrowSpaced}`}>
            Stack
          </p>
          <div className={styles.stack}>
            {portfolioBuilt.stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p className={`${styles.eyebrow} ${styles.eyebrowSpaced}`}>
            Key decisions
          </p>
          <ul className={styles.builtList}>
            {portfolioBuilt.decisions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="github-builds-heading">
          <p className={styles.eyebrow}>Selected GitHub builds</p>
          <h2 id="github-builds-heading">Full-stack projects with clear technical scope.</h2>
          <div className={styles.grid}>
            {codeProjects.map((project) => (
              <article key={project.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <p className={styles.eyebrow}>{project.type}</p>
                  <h3>{project.title}</h3>
                  <p className={styles.meta}>{project.description}</p>
                  <div className={styles.stack}>
                    {project.stack.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <div className={styles.links}>
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                      View source on GitHub
                    </a>
                    {project.liveUrl ? (
                      <a href={project.liveUrl} target="_blank" rel="noreferrer">
                        Open live project
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="about-heading">
          <p className={styles.eyebrow}>{classicPortfolio.about.eyebrow}</p>
          <h2 id="about-heading">{classicPortfolio.about.title}</h2>
          <p className={styles.meta}>{classicPortfolio.about.intro}</p>
          <p className={`${styles.meta} ${styles.metaSpacedLg}`}>
            <strong className={styles.strongText}>{classicPortfolio.about.focusHeading}: </strong>
            {classicPortfolio.about.focus}
          </p>
          <p className={styles.meta}>
            <strong className={styles.strongText}>{classicPortfolio.about.approachHeading}: </strong>
            {classicPortfolio.about.approach}
          </p>
          <p className={`${styles.meta} ${styles.metaSpaced}`}>
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
          <p className={`${styles.meta} ${styles.metaSpacedSm}`}>
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
