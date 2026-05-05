import { ArrowUpRight, Download, FolderOpen, Mail } from "lucide-react";
import { AppContent, AppScaffold, AppToolbar } from "@/components/apps/app-layout";
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
    <AppScaffold className="about-app">
      <AppToolbar>
        <div className="app-toolbar__group">
          <div className="app-toolbar__title">
            <strong>About</strong>
            <small>Taaniel Vananurm</small>
          </div>
        </div>
        <div className="app-toolbar__group">
          <button
            type="button"
            className="pill-button"
            onClick={() => launchApp({ appId: "contact" })}
          >
            <Mail size={14} />
            Contact
          </button>
          <button
            type="button"
            className="pill-button"
            onClick={() =>
              openFileSystemPath("/Documents/Taaniel-Vananurm-CV.pdf", nodes, launchApp)
            }
          >
            <Download size={14} />
            Resume
          </button>
        </div>
      </AppToolbar>

      <AppContent padded>
        {/* Hero */}
        <section className="hero-panel">
          <div>
            <p className="eyebrow">At a glance</p>
            <h1>{profile.name}</h1>
            <p className="lead">{profile.intro}</p>
          </div>
        </section>

        {/* Positioning + How I work */}
        <section className="dashboard-grid">
          <article className="glass-card">
            <p className="eyebrow">Background</p>
            <h2>{profile.role}</h2>
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
              <p>I care about clarity and hierarchy — the message should be obvious before anything else.</p>
              <p>I like building systems that are easy to maintain and extend, not just visually polished.</p>
              <p>This portfolio OS is built that way: the shell itself is part of the proof of work.</p>
            </div>
            <div className="token-list">
              {skills.map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </article>
        </section>

        {/* Files + Photography */}
        <section className="dashboard-grid">
          <article className="glass-card">
            <div className="section-row">
              <div>
                <p className="eyebrow">Portfolio files</p>
                <h3>Case studies and assets in the file explorer</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => openFileSystemPath("/Portfolio", nodes, launchApp)}
              >
                <FolderOpen size={15} />
                Browse files
              </button>
            </div>
            <p>Open the Portfolio folder to find case studies, visuals, and project documents.</p>
          </article>

          <article className="glass-card photo-strip">
            <div className="section-row">
              <div>
                <p className="eyebrow">Photography</p>
                <h3>Personal work outside of design</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  openFileSystemPath("/Media/Photography", nodes, launchApp)
                }
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
                      `/Media/Photography/${asset.title}.${
                        asset.src.endsWith(".png") ? "png" : "jpg"
                      }`,
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
      </AppContent>
    </AppScaffold>
  );
}
