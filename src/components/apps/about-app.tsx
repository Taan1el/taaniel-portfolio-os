import { ArrowUpRight, Download, FolderOpen, Mail, TerminalSquare } from "lucide-react";
import { photographyAssets, profile, quickStats, skills } from "@/data/portfolio";
import { openFileSystemPath } from "@/lib/launchers";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useSystemStore } from "@/stores/system-store";
import type { AppComponentProps } from "@/types/system";

export function AboutApp({ window }: AppComponentProps) {
  void window;
  const nodes = useFileSystemStore((state) => state.nodes);
  const launchApp = useSystemStore((state) => state.launchApp);

  return (
    <div className="app-screen about-app">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Recruiter brief</p>
          <h1>{profile.name}</h1>
          <p className="lead">{profile.intro}</p>
        </div>
        <div className="hero-panel__actions">
          <button type="button" className="pill-button" onClick={() => launchApp({ appId: "contact" })}>
            <Mail size={16} />
            Contact
          </button>
          <button
            type="button"
            className="pill-button"
            onClick={() => openFileSystemPath("/Documents/Taaniel-Vananurm-CV.pdf", nodes, launchApp)}
          >
            <Download size={16} />
            Resume
          </button>
          <button type="button" className="pill-button" onClick={() => launchApp({ appId: "terminal" })}>
            <TerminalSquare size={16} />
            Open terminal
          </button>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="glass-card">
          <p className="eyebrow">Positioning</p>
          <h2>Product-minded frontend builder</h2>
          <p>{profile.current}</p>
          <div className="stat-grid">
            {quickStats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <strong>{stat.label}</strong>
                <span>{stat.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card">
          <p className="eyebrow">How I work</p>
          <div className="bullet-stack">
            <p>I care about hierarchy, clarity, and how interaction supports understanding.</p>
            <p>I like systems that feel expressive without becoming messy or hard to maintain.</p>
            <p>This portfolio leans into that by making the shell itself part of the proof.</p>
          </div>
          <div className="token-list">
            {skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="glass-card">
          <div className="section-row">
            <div>
              <p className="eyebrow">Embedded content</p>
              <h3>Portfolio files live in the OS</h3>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => openFileSystemPath("/Portfolio", nodes, launchApp)}
            >
              <FolderOpen size={15} />
              Explore files
            </button>
          </div>
          <p>
            About notes, case studies, visuals, and the CV are all available as files so the portfolio
            behaves more like a real system and less like a themed landing page.
          </p>
        </article>

        <article className="glass-card photo-strip">
          <div className="section-row">
            <div>
              <p className="eyebrow">Photography</p>
              <h3>Visual reference library</h3>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => openFileSystemPath("/Media/Photography", nodes, launchApp)}
            >
              <ArrowUpRight size={15} />
              Open folder
            </button>
          </div>
          <div className="photo-strip__grid">
            {photographyAssets.slice(0, 4).map((asset) => (
              <button
                key={asset.title}
                type="button"
                className="photo-thumb"
                onClick={() =>
                  openFileSystemPath(
                    `/Media/Photography/${asset.title}.${asset.src.endsWith(".png") ? "png" : "jpg"}`,
                    nodes,
                    launchApp
                  )
                }
              >
                <img src={asset.src} alt={asset.title} />
              </button>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
