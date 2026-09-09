import { useEffect } from "react";
import { Download, ExternalLink, Code2, Mail, Monitor } from "lucide-react";
import { portfolioBuilt } from "@/data/portfolio-built";
import { classicPortfolio } from "@/data/classic-portfolio";
import {
  getResumeDownloadUrls,
  featuredProjects,
  liveDemoUrl,
  profile,
  repoUrl,
  socialLinks,
} from "@/data/portfolio";
import { SafeImage } from "@/components/ui/safe-image";
import { LogoMark } from "@/components/ui/logo-mark";
import styles from "@/components/recruiter/recruiter-view.module.css";

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
      <a className={styles.skipLink} href="#main-content">Skip to projects</a>
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
          <p className={styles.lead}>{profile.availability}</p>
          <div className={styles.actions}>
            <a className={styles.primaryBtn} href={primaryCv} download>
              <Download size={17} aria-hidden="true" /> Download CV (Estonian PDF)
            </a>
            <a className={styles.secondaryBtn} href={profile.email}>
              <Mail size={17} aria-hidden="true" /> Email me
            </a>
            <a className={styles.secondaryBtn} href="https://github.com/Taan1el" target="_blank" rel="noreferrer">
              <Code2 size={17} aria-hidden="true" /> GitHub profile
            </a>
            <a className={styles.secondaryBtn} href={import.meta.env.BASE_URL}>
              <Monitor size={17} aria-hidden="true" /> Open OS
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

        <main id="main-content" tabIndex={-1}>
        <section className={styles.section} aria-labelledby="classic-work-heading">
          <p className={styles.eyebrow}>{classicPortfolio.featured.eyebrow}</p>
          <h2 id="classic-work-heading">{classicPortfolio.featured.title}</h2>
          <div className={styles.classicFeatured}>
            {featuredProjects.map((project) => (
              <article key={project.id} className={styles.classicCard}>
                <div className={styles.classicCardImage}>
                  <SafeImage src={project.hero} alt={project.heroAlt ?? project.title} />
                </div>
                <div className={styles.classicCardBody}>
                  <p className={styles.eyebrow}>{project.type}</p>
                  <h3>{project.title}</h3>
                  <p className={styles.meta}>{project.oneLiner}</p>
                  <dl className={styles.projectFacts}>
                    <div><dt>Problem</dt><dd>{project.problem}</dd></div>
                    <div><dt>My role</dt><dd>{project.role}</dd></div>
                    <div><dt>Result</dt><dd>{project.outcome}</dd></div>
                  </dl>
                  <p className={styles.meta}>{project.challengesAndTradeoffs}</p>
                  <ul className={styles.stack} aria-label={`${project.title} technologies`}>
                    {project.stack.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <div className={styles.links}>
                    <a href={project.liveUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} aria-hidden="true" /> {project.title} demo
                    </a>
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                      <Code2 size={16} aria-hidden="true" /> {project.title} source
                    </a>
                  </div>
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
          <p className={`${styles.meta} ${styles.metaSpaced}`}>{classicPortfolio.work.dates}</p>
          <p className={`${styles.meta} ${styles.metaSpaced}`}>{classicPortfolio.work.outcome}</p>
          <p className={`${styles.meta} ${styles.metaSpaced}`}>{classicPortfolio.work.confidentiality}</p>
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
            Email is the best way to reach me.
          </p>
          <div className={styles.footerLinks}>
            {socialLinks.map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}
