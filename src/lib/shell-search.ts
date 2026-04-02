import { featuredProjects, profile, socialLinks } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import { normalizePath } from "@/lib/filesystem";
import type {
  AppId,
  AppDefinition,
  FileSystemRecord,
  WindowPayload,
} from "@/types/system";

export type ShellSearchSectionId = "apps" | "files" | "links" | "portfolio";

export type ShellSearchAction =
  | { type: "launch-app"; appId: AppId; payload?: WindowPayload; title?: string }
  | { type: "open-path"; path: string }
  | { type: "open-external"; url: string };

export interface ShellSearchEntry {
  id: string;
  section: ShellSearchSectionId;
  type: "app" | "file" | "folder" | "link" | "portfolio";
  title: string;
  subtitle: string;
  tokens: string;
  icon?: AppDefinition["icon"];
  accent?: string;
  action: ShellSearchAction;
}

export interface ShellSearchResult extends ShellSearchEntry {
  score: number;
}

export interface ShellSearchSection {
  id: ShellSearchSectionId;
  label: string;
  emptyLabel: string;
  results: ShellSearchResult[];
}

interface ShellSearchIndex {
  apps: ShellSearchEntry[];
  files: ShellSearchEntry[];
  links: ShellSearchEntry[];
  portfolio: ShellSearchEntry[];
}

const sectionLabels: Record<ShellSearchSectionId, { label: string; emptyLabel: string }> = {
  apps: { label: "Apps", emptyLabel: "No matching apps." },
  files: { label: "Files", emptyLabel: "No matching files or folders." },
  links: { label: "Links", emptyLabel: "No matching links." },
  portfolio: { label: "Portfolio", emptyLabel: "No matching portfolio content." },
};

const defaultFileSuggestions = [
  "/Portfolio",
  "/Media/Photography",
  "/Media/Music",
  "/Documents/Taaniel-Vananurm-CV.pdf",
];

function tokenize(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function scoreEntry(entry: ShellSearchEntry, query: string) {
  if (!query) {
    return 0;
  }

  const normalizedTitle = entry.title.toLowerCase();
  const normalizedSubtitle = entry.subtitle.toLowerCase();
  let score = 0;

  if (normalizedTitle === query) {
    score += 500;
  }

  if (normalizedTitle.startsWith(query)) {
    score += 320;
  } else if (normalizedTitle.includes(query)) {
    score += 220;
  }

  if (normalizedSubtitle.startsWith(query)) {
    score += 140;
  } else if (normalizedSubtitle.includes(query)) {
    score += 80;
  }

  if (entry.tokens.includes(query)) {
    score += 60;
  }

  return score;
}

function formatSearchLink(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

export function formatSearchPath(path: string) {
  const normalizedPath = normalizePath(path).replace(/\/$/, "");
  const parts = normalizedPath.split("/").filter(Boolean);

  if (parts.length <= 3) {
    return normalizedPath;
  }

  return `/${["...", ...parts.slice(-2)].join("/")}`;
}

function compareResults(a: ShellSearchResult, b: ShellSearchResult) {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  return a.title.localeCompare(b.title);
}

function buildAppEntries(apps: AppDefinition[]) {
  return apps.map<ShellSearchEntry>((app) => ({
    id: `app:${app.id}`,
    section: "apps",
    type: "app",
    title: app.title,
    subtitle: app.category,
    tokens: tokenize(app.title, app.description, app.category),
    icon: app.icon,
    accent: app.accent,
    action: { type: "launch-app", appId: app.id },
  }));
}

function buildFileEntries(nodes: FileSystemRecord) {
  return Object.values(nodes)
    .filter((node) => node.path !== "/")
    .map<ShellSearchEntry>((node) => ({
      id: `node:${node.path}`,
      section: "files",
      type: node.kind === "directory" ? "folder" : "file",
      title: node.name,
      subtitle: formatSearchPath(node.path),
      tokens: tokenize(node.name, node.path, node.kind, node.kind === "file" ? node.mimeType : undefined),
      action: { type: "open-path", path: node.path },
    }));
}

function buildLinkEntries() {
  return socialLinks.map<ShellSearchEntry>((link) => ({
    id: `link:${link.label}`,
    section: "links",
    type: "link",
    title: link.label,
    subtitle: formatSearchLink(link.url),
    tokens: tokenize(link.label, link.url, formatSearchLink(link.url)),
    action: { type: "open-external", url: link.url },
  }));
}

function buildPortfolioEntries() {
  const aboutResults: ShellSearchEntry[] = [
    {
      id: "portfolio:about",
      section: "portfolio",
      type: "portfolio",
      title: profile.name,
      subtitle: "About, skills, and availability",
      tokens: tokenize(
        profile.name,
        profile.role,
        profile.shortRole,
        profile.headline,
        profile.intro,
        profile.current,
        profile.availability,
        profile.location
      ),
      action: { type: "launch-app", appId: "about" },
    },
    {
      id: "portfolio:contact",
      section: "portfolio",
      type: "portfolio",
      title: "Contact details",
      subtitle: profile.emailText,
      tokens: tokenize(profile.emailText, profile.phoneText, profile.location, "contact"),
      action: { type: "launch-app", appId: "contact" },
    },
  ];

  const projectResults = featuredProjects.map<ShellSearchEntry>((project) => ({
    id: `portfolio:${project.id}`,
    section: "portfolio",
    type: "portfolio",
    title: project.title,
    subtitle: project.type,
    tokens: tokenize(
      project.title,
      project.type,
      project.oneLiner,
      project.role,
      project.challenge,
      project.outcome,
      ...project.stack
    ),
    action: { type: "launch-app", appId: "projects", payload: { projectId: project.id } },
  }));

  return [...aboutResults, ...projectResults];
}

export function buildShellSearchIndex(nodes: FileSystemRecord): ShellSearchIndex {
  const apps = getAppRegistry();

  return {
    apps: buildAppEntries(apps),
    files: buildFileEntries(nodes),
    links: buildLinkEntries(),
    portfolio: buildPortfolioEntries(),
  };
}

function getDefaultFileResults(entries: ShellSearchEntry[]) {
  const suggestions = defaultFileSuggestions
    .map((path) => entries.find((entry) => entry.action.type === "open-path" && entry.action.path === path))
    .filter((entry): entry is ShellSearchEntry => Boolean(entry));

  if (suggestions.length > 0) {
    return suggestions;
  }

  return entries.slice(0, 4);
}

export function queryShellSearch(index: ShellSearchIndex, rawQuery: string): ShellSearchSection[] {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return [
      {
        id: "apps",
        ...sectionLabels.apps,
        results: index.apps.slice(0, 6).map((entry) => ({ ...entry, score: 0 })),
      },
      {
        id: "files",
        ...sectionLabels.files,
        results: getDefaultFileResults(index.files).map((entry) => ({ ...entry, score: 0 })),
      },
      {
        id: "links",
        ...sectionLabels.links,
        results: index.links.slice(0, 4).map((entry) => ({ ...entry, score: 0 })),
      },
      {
        id: "portfolio",
        ...sectionLabels.portfolio,
        results: index.portfolio.slice(0, 4).map((entry) => ({ ...entry, score: 0 })),
      },
    ];
  }

  return (Object.keys(index) as Array<keyof ShellSearchIndex>).map((sectionId) => {
    const entries = index[sectionId]
      .map((entry) => ({ ...entry, score: scoreEntry(entry, query) }))
      .filter((entry) => entry.score > 0)
      .sort(compareResults)
      .slice(0, 6);

    return {
      id: sectionId,
      ...sectionLabels[sectionId],
      results: entries,
    };
  });
}

export function getTopSearchResult(sections: ShellSearchSection[]) {
  return sections
    .flatMap((section) => section.results)
    .sort(compareResults)[0] ?? null;
}
