import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  HardDriveDownload,
  Image,
  LayoutGrid,
  Mail,
  Power,
  Search,
  Settings2,
  Sparkles,
  TerminalSquare,
  Video,
} from "lucide-react";
import { profile, socialLinks } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import { cn } from "@/lib/utils";
import type { AppCategory, AppId } from "@/types/system";

const categoryMeta: Record<
  AppCategory,
  {
    label: string;
    description: string;
    icon: typeof BriefcaseBusiness;
  }
> = {
  Portfolio: {
    label: "Portfolio",
    description: "Recruiter-facing portfolio surfaces and profile apps.",
    icon: Sparkles,
  },
  Workspace: {
    label: "Workspace",
    description: "Productivity apps, browser tools, and document workflows.",
    icon: LayoutGrid,
  },
  Media: {
    label: "Media",
    description: "Photo, video, and rich asset viewers.",
    icon: Image,
  },
  System: {
    label: "System",
    description: "Environment controls and desktop configuration.",
    icon: Settings2,
  },
};

const railLinks = [
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    action: "directory" as const,
    path: "/Documents",
  },
  {
    id: "pictures",
    label: "Pictures",
    icon: Image,
    action: "directory" as const,
    path: "/Media/Photography",
  },
  {
    id: "videos",
    label: "Videos",
    icon: Video,
    action: "directory" as const,
    path: "/Media/Videos",
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: TerminalSquare,
    action: "app" as const,
    appId: "terminal" as const,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    action: "app" as const,
    appId: "settings" as const,
  },
];

const quickAccessCards = [
  {
    id: "documents-card",
    label: "Documents",
    description: "Resume, notes, and imported PDFs.",
    icon: HardDriveDownload,
    directoryPath: "/Documents",
  },
  {
    id: "pictures-card",
    label: "Pictures",
    description: "Photography, visual references, and image uploads.",
    icon: Image,
    directoryPath: "/Media/Photography",
  },
  {
    id: "videos-card",
    label: "Videos",
    description: "Reels, motion studies, and imported clips.",
    icon: Video,
    directoryPath: "/Media/Videos",
  },
];

function updateSpotlightPosition(event: React.MouseEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`);
}

interface StartMenuProps {
  onLaunchApp: (appId: AppId) => void;
  onOpenDirectory: (directoryPath: string) => void;
  onOpenFile: (filePath: string) => void;
  onResetSession: () => void;
  onRequestClose: () => void;
}

export function StartMenu({
  onLaunchApp,
  onOpenDirectory,
  onOpenFile,
  onResetSession,
  onRequestClose,
}: StartMenuProps) {
  const [query, setQuery] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<AppCategory, boolean>>({
    Portfolio: true,
    Workspace: true,
    Media: true,
    System: false,
  });
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const apps = getAppRegistry();
  const categoryOrder: AppCategory[] = ["Portfolio", "Workspace", "Media", "System"];

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      if (menuRef.current?.contains(target) || target.closest(".taskbar__start")) {
        return;
      }

      onRequestClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onRequestClose]);

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
  const showSearchResults = query.trim().length > 0;

  return (
    <motion.aside
      ref={menuRef}
      className="start-menu"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="start-menu__rail"
        animate={{ width: sidebarExpanded ? 228 : 72 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <button
          type="button"
          className="start-menu__rail-toggle"
          onClick={() => setSidebarExpanded((expanded) => !expanded)}
          onMouseMove={updateSpotlightPosition}
        >
          {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          <span>Quick links</span>
        </button>

        <div className="start-menu__rail-group">
          <button
            type="button"
            className="start-menu__rail-item"
            onClick={() => onOpenFile("/Documents/Taaniel-Vananurm-CV.pdf")}
            onMouseMove={updateSpotlightPosition}
          >
            <Mail size={16} />
            <span>Open Resume.pdf</span>
          </button>

          {railLinks.map((link) => {
            const Icon = link.icon;

            return (
              <button
                key={link.id}
                type="button"
                className="start-menu__rail-item"
                onClick={() => {
                  if (link.action === "app" && link.appId) {
                    onLaunchApp(link.appId);
                    return;
                  }

                  if (link.action === "directory") {
                    onOpenDirectory(link.path);
                  }
                }}
                onMouseMove={updateSpotlightPosition}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="start-menu__rail-item is-danger"
          onClick={onResetSession}
          onMouseMove={updateSpotlightPosition}
        >
          <Power size={16} />
          <span>Reset session</span>
        </button>
      </motion.div>

      <div className="start-menu__main">
        <div className="start-menu__hero">
          <div>
            <p className="eyebrow">Portfolio OS</p>
            <h2>{profile.name}</h2>
            <p>{profile.headline}</p>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => onLaunchApp("contact")}
            onMouseMove={updateSpotlightPosition}
          >
            <Mail size={14} />
            Contact
          </button>
        </div>

        <label className="start-menu__search">
          <Search size={16} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search apps, tools, and system folders"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && firstResult) {
                onLaunchApp(firstResult.id);
              }
            }}
          />
        </label>

        <div className="start-menu__quick-grid">
          {quickAccessCards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.id}
                type="button"
                className="start-menu__quick-card"
                onClick={() => onOpenDirectory(card.directoryPath)}
                onMouseMove={updateSpotlightPosition}
              >
                <span className="start-menu__quick-card-icon">
                  <Icon size={16} />
                </span>
                <span>
                  <strong>{card.label}</strong>
                  <small>{card.description}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="start-menu__section">
          <div className="section-row">
            <span className="section-title">{showSearchResults ? "Search results" : "Apps"}</span>
            <button type="button" className="ghost-button" onClick={() => onLaunchApp("settings")}>
              <Settings2 size={14} />
              Settings
            </button>
          </div>

          <div className="start-menu__catalog">
            {groupedApps.length > 0 ? (
              groupedApps.map((group) => {
                const meta = categoryMeta[group.category];
                const FolderIcon = meta.icon;
                const expanded = showSearchResults ? true : expandedFolders[group.category];

                return (
                  <section key={group.category} className="start-menu__folder">
                    <button
                      type="button"
                      className={cn("start-menu__folder-trigger", expanded && "is-open")}
                      onClick={() =>
                        setExpandedFolders((current) => ({
                          ...current,
                          [group.category]: !current[group.category],
                        }))
                      }
                      onMouseMove={updateSpotlightPosition}
                    >
                      <span className="start-menu__folder-meta">
                        <span className="start-menu__folder-icon">
                          <FolderIcon size={16} />
                        </span>
                        <span>
                          <strong>{meta.label}</strong>
                          <small>{meta.description}</small>
                        </span>
                      </span>
                      <span className="start-menu__folder-count">
                        {group.items.length}
                        <ChevronRight size={14} />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded ? (
                        <motion.div
                          className="start-menu__apps"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        >
                          {group.items.map((app) => {
                            const Icon = app.icon;

                            return (
                              <button
                                key={app.id}
                                type="button"
                                className="start-menu__app"
                                onClick={() => onLaunchApp(app.id)}
                                onMouseMove={updateSpotlightPosition}
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
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </section>
                );
              })
            ) : (
              <div className="start-menu__empty">
                <strong>No apps match your search</strong>
                <small>Try "terminal", "explorer", "settings", or "projects".</small>
              </div>
            )}
          </div>
        </div>

        <div className="start-menu__footer">
          <div className="start-menu__links">
            {socialLinks.slice(0, 4).map((link) => (
              <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
          <button
            type="button"
            className="quick-link"
            onClick={() => onOpenDirectory("/Portfolio/Case Studies")}
            onMouseMove={updateSpotlightPosition}
          >
            <FolderOpen size={15} />
            Featured work
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
