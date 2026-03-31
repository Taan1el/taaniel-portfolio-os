import { ArrowUpRight, FileText, FolderOpen, Image as ImageIcon } from "lucide-react";
import { featuredProjects } from "@/data/portfolio";
import { openFileSystemPath } from "@/lib/launchers";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

export function ProjectsApp({ window }: AppComponentProps) {
  void window;
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);

  return (
    <div className="app-screen projects-app">
      <section className="section-headline">
        <div>
          <p className="eyebrow">Featured work</p>
          <h1>Campaign design and frontend storytelling</h1>
          <p className="lead">
            These projects are presented as files, visuals, and case study notes so the portfolio feels
            like a working desktop instead of a page stack.
          </p>
        </div>
      </section>

      <div className="project-card-grid">
        {featuredProjects.map((project) => (
          <article key={project.id} className="project-showcase">
            <div className="project-showcase__image">
              <img src={project.hero} alt={project.title} />
            </div>
            <div className="project-showcase__body">
              <div>
                <p className="eyebrow">{project.type}</p>
                <h2>{project.title}</h2>
                <p>{project.oneLiner}</p>
              </div>
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
              </dl>
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
                      `/Portfolio/Case Studies/${project.title}/Hero.${project.hero.endsWith(".png") ? "png" : "jpg"}`,
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

      <section className="glass-card callout-card">
        <div>
          <p className="eyebrow">Portfolio angle</p>
          <h3>More than a gallery</h3>
          <p>
            The OS format lets me package visual work, implementation intent, documents, and interaction
            design into one consistent system. That balance is the main signal this project is trying to send.
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={() => launchApp({ appId: "contact" })}>
          <ArrowUpRight size={15} />
          Discuss the work
        </button>
      </section>
    </div>
  );
}
