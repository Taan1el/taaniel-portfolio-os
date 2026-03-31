import { useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Github, Mail, Power, Search, Settings2, TerminalSquare } from "lucide-react";
import { featuredProjects, profile, resumePdfPath, socialLinks } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import type { AppCategory, AppId } from "@/types/system";

interface StartMenuProps {
  onLaunchApp: (appId: AppId) => void;
  onOpenDirectory: (directoryPath: string) => void;
  onOpenFile: (filePath: string) => void;
  onResetSession: () => void;
}

export function StartMenu({
  onLaunchApp,
  onOpenDirectory,
  onOpenFile,
  onResetSession,
}: StartMenuProps) {
  const [query, setQuery] = useState("");
  const apps = getAppRegistry();
  const categoryOrder: AppCategory[] = ["Portfolio", "Workspace", "Media", "System"];

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return apps;
    }

    return apps.filter(
      (app) =>
        app.title.toLowerCase().includes(normalizedQuery) ||
        app.description.toLowerCase().includes(normalizedQuery) ||
        app.category.toLowerCase().includes(normalizedQuery)
    );
  }, [apps, query]);

  const groupedApps = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          items: filteredApps.filter((app) => app.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [categoryOrder, filteredApps]
  );

  const firstResult = filteredApps[0];

  return (
    <motion.aside
      className="start-menu"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="start-menu__hero">
        <p className="eyebrow">Portfolio OS</p>
        <h2>{profile.name}</h2>
        <p>{profile.headline}</p>
      </div>

      <label className="start-menu__search">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search apps, tools, files"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && firstResult) {
              onLaunchApp(firstResult.id);
            }
          }}
        />
      </label>

      <div className="start-menu__section">
        <div className="section-row">
          <span className="section-title">{query ? "Search results" : "App launcher"}</span>
          <button type="button" className="ghost-button" onClick={() => onLaunchApp("settings")}>
            <Settings2 size={14} />
            Settings
          </button>
        </div>

        <div className="start-menu__catalog">
          {filteredApps.length > 0 ? (
            groupedApps.map((group) => (
              <section key={group.category} className="start-menu__category">
                <p className="section-title">{group.category}</p>
                <div className="start-menu__apps">
                  {group.items.map((app) => {
                    const Icon = app.icon;

                    return (
                      <button
                        key={app.id}
                        type="button"
                        className="start-menu__app"
                        onClick={() => onLaunchApp(app.id)}
                      >
                        <span
                          className="start-menu__app-icon"
                          style={{ "--app-accent": app.accent } as CSSProperties}
                        >
                          <Icon size={18} />
                        </span>
                        <span>
                          <strong>{app.title}</strong>
                          <small>{app.description}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <div className="start-menu__empty">
              <strong>No apps match your search</strong>
              <small>Try "terminal", "projects", or "resume".</small>
            </div>
          )}
        </div>
      </div>

      <div className="start-menu__columns">
        <div className="start-menu__section">
          <span className="section-title">Quick access</span>
          <button type="button" className="quick-link" onClick={() => onLaunchApp("terminal")}>
            <TerminalSquare size={15} />
            Terminal
          </button>
          <button type="button" className="quick-link" onClick={() => onOpenDirectory("/Portfolio")}>
            <FolderOpen size={15} />
            Portfolio files
          </button>
          <button type="button" className="quick-link" onClick={() => onOpenDirectory("/Users/Public/Blog")}>
            <FolderOpen size={15} />
            Blog
          </button>
          <button
            type="button"
            className="quick-link"
            onClick={() => onOpenFile("/Documents/Taaniel-Vananurm-CV.pdf")}
          >
            <Mail size={15} />
            Resume.pdf
          </button>
          <a className="quick-link" href={profile.email}>
            <Mail size={15} />
            Email Taaniel
          </a>
        </div>

        <div className="start-menu__section">
          <span className="section-title">Featured folders and links</span>
          {featuredProjects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="quick-link"
              onClick={() => onOpenDirectory(`/Portfolio/Case Studies/${project.title}`)}
            >
              <FolderOpen size={15} />
              {project.title}
            </button>
          ))}
          <a className="quick-link" href="https://github.com/Taan1el" target="_blank" rel="noreferrer">
            <Github size={15} />
            GitHub profile
          </a>
        </div>
      </div>

      <div className="start-menu__footer">
        <div className="start-menu__links">
          {socialLinks.slice(0, 4).map((link) => (
            <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
          <a href={resumePdfPath} target="_blank" rel="noreferrer">
            Download CV
          </a>
        </div>
        <button type="button" className="power-button" onClick={onResetSession}>
          <Power size={15} />
          Reset session
        </button>
      </div>
    </motion.aside>
  );
}
