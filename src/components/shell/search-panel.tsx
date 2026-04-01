import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileText, Folder, Search } from "lucide-react";
import { socialLinks } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import { searchNodes } from "@/lib/filesystem";
import type { AppId, FileSystemRecord } from "@/types/system";

function formatSearchLink(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

function formatSearchPath(path: string) {
  const normalizedPath = path.replace(/\/$/, "");
  const parts = normalizedPath.split("/").filter(Boolean);

  if (parts.length <= 3) {
    return normalizedPath;
  }

  return `/${["...", ...parts.slice(-2)].join("/")}`;
}

interface SearchPanelProps {
  nodes: FileSystemRecord;
  onLaunchApp: (appId: AppId) => void;
  onOpenPath: (path: string) => void;
  onOpenExternal: (url: string) => void;
}

export function SearchPanel({
  nodes,
  onLaunchApp,
  onOpenPath,
  onOpenExternal,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const apps = getAppRegistry();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const appResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return apps.slice(0, 6);
    }

    return apps
      .filter(
        (app) =>
          app.title.toLowerCase().includes(normalizedQuery) ||
          app.description.toLowerCase().includes(normalizedQuery) ||
          app.category.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 6);
  }, [apps, query]);

  const fileResults = useMemo(() => searchNodes(nodes, query, 8), [nodes, query]);
  const linkResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return socialLinks.slice(0, 3);
    }

    return socialLinks.filter(
      (link) =>
        link.label.toLowerCase().includes(normalizedQuery) ||
        link.url.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  const topApp = appResults[0];
  const topFile = fileResults[0];
  const topLink = linkResults[0];

  return (
    <motion.section
      className="search-panel"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <label className="search-panel__input">
        <Search size={16} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search apps, files, links"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            if (topApp) {
              onLaunchApp(topApp.id);
              return;
            }

            if (topFile) {
              onOpenPath(topFile.path);
              return;
            }

            if (topLink) {
              onOpenExternal(topLink.url);
            }
          }}
        />
      </label>

      <div className="search-panel__results">
        <section className="search-panel__section">
          <p className="section-title">Apps</p>
          {appResults.map((app) => {
            const Icon = app.icon;

            return (
              <button key={app.id} type="button" className="search-result" onClick={() => onLaunchApp(app.id)}>
                <span className="search-result__icon" style={{ "--app-accent": app.accent } as CSSProperties}>
                  <Icon size={16} />
                </span>
                <span className="search-result__meta">
                  <strong title={app.title}>{app.title}</strong>
                  <small title={app.category}>{app.category}</small>
                </span>
              </button>
            );
          })}
        </section>

        <section className="search-panel__section">
          <p className="section-title">Files</p>
          {fileResults.length > 0 ? (
            fileResults.map((node) => (
              <button
                key={node.path}
                type="button"
                className="search-result"
                onClick={() => onOpenPath(node.path)}
              >
                <span className="search-result__icon">
                  {node.kind === "directory" ? <Folder size={16} /> : <FileText size={16} />}
                </span>
                <span className="search-result__meta">
                  <strong title={node.name}>{node.name}</strong>
                  <small title={node.path}>{formatSearchPath(node.path)}</small>
                </span>
              </button>
            ))
          ) : (
            <div className="search-panel__empty">No file matches yet.</div>
          )}
        </section>

        <section className="search-panel__section">
          <p className="section-title">Links</p>
          {linkResults.map((link) => (
            <button
              key={link.label}
              type="button"
              className="search-result"
              onClick={() => onOpenExternal(link.url)}
            >
              <span className="search-result__icon">
                <ExternalLink size={16} />
              </span>
              <span className="search-result__meta">
                <strong title={link.label}>{link.label}</strong>
                <small title={formatSearchLink(link.url)}>{formatSearchLink(link.url)}</small>
              </span>
            </button>
          ))}
        </section>
      </div>
    </motion.section>
  );
}
