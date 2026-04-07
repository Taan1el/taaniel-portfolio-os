import { ExternalLink, FileText, FolderOpen, Image as ImageIcon } from "lucide-react";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { portfolioBuilt } from "@/data/portfolio-built";
import { featuredProjects } from "@/data/portfolio";
import { openFileSystemPath } from "@/lib/launchers";
import { getImageFileMetaFromUrl } from "@/lib/image-path";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import { SafeImage } from "@/components/ui/safe-image";
import type { AppComponentProps } from "@/types/system";

function heroVirtualFilename(heroUrl: string) {
  const meta = getImageFileMetaFromUrl(heroUrl);
  return `Hero.${meta.extension}`;
}

export function ProjectsApp({ window }: AppComponentProps) {
  void window;
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);

  return (
    <AppScaffold className="projects-app">
      <AppContent padded>
        <section className="section-headline">
          <div>
            <p className="eyebrow">Featured work</p>
            <h1>Frontend systems + campaign UI</h1>
            <p className="lead">
              The desktop shell below is project #1. Email and visual campaigns follow with the same structure: problem,
              decisions, and outcomes.
            </p>
          </div>
        </section>

        <div className="project-card-grid">
          {featuredProjects.map((project) => (
            <article key={project.id} className="project-showcase">
              <div className="project-showcase__image">
                <SafeImage src={project.hero} alt="" />
              </div>
              <div className="project-showcase__body">
                <div>
                  <p className="eyebrow">{project.type}</p>
                  <h2>{project.title}</h2>
                  <p>{project.oneLiner}</p>
                </div>
                {project.problem ? (
                  <dl className="mini-facts">
                    <div>
                      <dt>Problem</dt>
                      <dd>{project.problem}</dd>
                    </div>
                  </dl>
                ) : null}
                <dl className="mini-facts">
                  <div>
                    <dt>Role</dt>
                    <dd>{project.role}</dd>
                  </div>
                  <div>
                    <dt>Challenge</dt>
                    <dd>{project.challenge}</dd>
                  </div>
                  <div>
                    <dt>Outcome</dt>
                    <dd>{project.outcome}</dd>
                  </div>
                  {project.measurableOutcome ? (
                    <div>
                      <dt>Impact</dt>
                      <dd>{project.measurableOutcome}</dd>
                    </div>
                  ) : null}
                </dl>
                {project.architecture?.length ? (
                  <dl className="mini-facts">
                    {project.architecture.map((block) => (
                      <div key={block.title}>
                        <dt>{block.title}</dt>
                        <dd>{block.body}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {project.technicalHighlights?.length ? (
                  <ul className="bullet-stack" style={{ margin: 0, paddingLeft: "1.1rem" }}>
                    {project.technicalHighlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                ) : null}
                {project.challengesAndTradeoffs ? (
                  <dl className="mini-facts">
                    <div>
                      <dt>Tradeoffs</dt>
                      <dd>{project.challengesAndTradeoffs}</dd>
                    </div>
                  </dl>
                ) : null}
                {project.whatILearned ? (
                  <dl className="mini-facts">
                    <div>
                      <dt>Learned</dt>
                      <dd>{project.whatILearned}</dd>
                    </div>
                  </dl>
                ) : null}
                <div className="action-row">
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() =>
                      openFileSystemPath(`/Portfolio/Case Studies/${project.title}/Overview.md`, nodes, launchApp)
                    }
                  >
                    <FileText size={15} />
                    Read case study
                  </button>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() =>
                      openFileSystemPath(
                        `/Portfolio/Case Studies/${project.title}/${heroVirtualFilename(project.hero)}`,
                        nodes,
                        launchApp
                      )
                    }
                  >
                    <ImageIcon size={15} />
                    Open hero
                  </button>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() =>
                      openFileSystemPath(`/Portfolio/Case Studies/${project.title}`, nodes, launchApp)
                    }
                  >
                    <FolderOpen size={15} />
                    Open folder
                  </button>
                  {project.repoUrl ? (
                    <a className="pill-button" href={project.repoUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} />
                      GitHub
                    </a>
                  ) : null}
                  {project.liveUrl ? (
                    <a className="pill-button" href={project.liveUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} />
                      Live
                    </a>
                  ) : null}
                </div>
                <div className="token-list">
                  {project.stack.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="section-headline" style={{ marginTop: "2rem" }}>
          <div>
            <p className="eyebrow">Engineering</p>
            <h2>{portfolioBuilt.headline}</h2>
            <p className="lead">{portfolioBuilt.architectureSummary}</p>
            <div className="token-list" style={{ marginTop: "0.75rem" }}>
              {portfolioBuilt.stack.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <ul className="bullet-stack" style={{ marginTop: "1rem" }}>
              {portfolioBuilt.decisions.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </section>
      </AppContent>
    </AppScaffold>
  );
}
