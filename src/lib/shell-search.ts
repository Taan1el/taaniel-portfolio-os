import {
  featuredProjects,
  photographyAssets,
  profile,
  quickStats,
  skills,
  socialLinks,
} from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import { getFileAssociationDescriptor, isTextLikeExtension } from "@/lib/file-registry";
import { normalizePath } from "@/lib/filesystem";
import { isNotesPath } from "@/lib/notes";
import type {
  AppDefinition,
  AppId,
  FileSystemRecord,
  VirtualNode,
  WindowPayload,
} from "@/types/system";

export type ShellSearchSectionId = "apps" | "files" | "links" | "portfolio";
export type ShellSearchMatchMode = "exact" | "semantic" | "keyword";

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
  actionLabel: string;
  aliases: string[];
  semanticTags: string[];
  previewText?: string;
}

export interface ShellSearchResult extends ShellSearchEntry {
  score: number;
  matchMode: ShellSearchMatchMode;
  matchedTerms: string[];
  preview?: string;
}

export interface ShellSearchSection {
  id: ShellSearchSectionId;
  label: string;
  emptyLabel: string;
  results: ShellSearchResult[];
}

export interface ShellSearchAiCandidate {
  id: string;
  title: string;
  content: string;
  score: number;
  matchMode: ShellSearchMatchMode;
}

export interface ShellSearchAiRanking {
  id: string;
  similarity: number;
}

interface ShellSearchIndex {
  apps: ShellSearchEntry[];
  files: ShellSearchEntry[];
  links: ShellSearchEntry[];
  portfolio: ShellSearchEntry[];
  all: ShellSearchEntry[];
}

interface SearchIntent {
  normalizedQuery: string;
  titleQuery: string;
  tokens: string[];
  expandedTerms: string[];
  semanticTags: string[];
  verbs: string[];
}

const sectionLabels: Record<ShellSearchSectionId, { label: string; emptyLabel: string }> = {
  apps: { label: "Apps", emptyLabel: "No matching apps." },
  files: { label: "Files", emptyLabel: "No matching files or folders." },
  links: { label: "Links", emptyLabel: "No matching links." },
  portfolio: { label: "Portfolio", emptyLabel: "No matching portfolio content." },
};

const defaultFileSuggestions = [
  "/Portfolio",
  "/Portfolio/Case Studies",
  "/Media/Photography",
  "/Media/Music",
  "/Documents/Taaniel-Vananurm-CV.pdf",
];

const stopWords = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "from",
  "in",
  "into",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const searchVerbs = new Set([
  "browse",
  "find",
  "go",
  "jump",
  "launch",
  "listen",
  "open",
  "play",
  "read",
  "reveal",
  "run",
  "search",
  "show",
  "start",
  "view",
  "watch",
]);

const intentGroups = [
  {
    tag: "apps",
    terms: ["app", "apps", "application", "applications", "program", "tool", "tools"],
  },
  {
    tag: "files",
    terms: ["file", "files", "document", "documents", "pdf", "doc", "docs"],
  },
  {
    tag: "folders",
    terms: ["folder", "folders", "directory", "directories", "explorer"],
  },
  {
    tag: "notes",
    terms: ["note", "notes", "memo", "memos", "sticky", "todo", "to do", "todo list"],
  },
  {
    tag: "projects",
    terms: ["project", "projects", "case study", "case studies", "portfolio", "work", "workbench"],
  },
  {
    tag: "contact",
    terms: ["contact", "email", "mail", "phone", "linkedin", "instagram", "github", "dribbble", "unsplash"],
  },
  {
    tag: "photos",
    terms: ["photo", "photos", "photography", "picture", "pictures", "image", "images", "gallery"],
  },
  {
    tag: "music",
    terms: ["music", "song", "songs", "track", "tracks", "audio", "playlist", "mp3", "wav"],
  },
  {
    tag: "games",
    terms: ["game", "games", "play", "arcade", "snake", "tetris", "dino", "doom", "hextris"],
  },
  {
    tag: "browser",
    terms: ["browser", "web", "website", "websites", "site", "sites", "link", "links"],
  },
  {
    tag: "settings",
    terms: ["setting", "settings", "theme", "themes", "wallpaper", "wallpapers", "personalize"],
  },
  {
    tag: "resume",
    terms: ["resume", "cv"],
  },
];

const appAliases: Partial<Record<AppId, string[]>> = {
  about: ["profile", "bio", "about me", "skills", "availability"],
  browser: ["web", "internet", "links", "github", "website"],
  contact: ["email", "phone", "linkedin", "socials"],
  doom: ["freedoom", "fps"],
  files: ["explorer", "folders", "directory", "filesystem"],
  games: ["arcade", "play"],
  snake: ["arcade", "retro", "classic snake"],
  music: ["songs", "tracks", "playlist", "audio"],
  notes: ["memo", "sticky notes", "to do", "todo list", "notepad"],
  paint: ["drawing", "canvas", "image editor"],
  pdf: ["pdf", "document reader"],
  photos: ["gallery", "images", "pictures", "viewer"],
  projects: ["work", "case studies", "portfolio work"],
  settings: ["theme", "wallpaper", "preferences"],
  terminal: ["console", "command line", "shell"],
  tetris: ["blocks", "falling blocks", "arcade puzzle"],
  v86: ["emulator", "virtual machine", "x86"],
  video: ["videos", "video player", "reel"],
};

function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\bwww\./g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s'.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeSearchValue(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !stopWords.has(token));
}

function humanizeLabel(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function joinSearchParts(...parts: Array<string | undefined>) {
  return normalizeSearchValue(parts.filter(Boolean).join(" "));
}

function clampContentPreview(content: string) {
  return content.replace(/\s+/g, " ").trim().slice(0, 480);
}

function uniqueTerms(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function formatSearchLink(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

export function formatSearchPath(path: string) {
  const normalized = normalizePath(path).replace(/\/$/, "");
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length <= 3) {
    return normalized;
  }

  return `/${["...", ...parts.slice(-2)].join("/")}`;
}

function compareResults(a: ShellSearchResult, b: ShellSearchResult) {
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  return a.title.localeCompare(b.title);
}

function resolveNodeSemanticTags(node: VirtualNode) {
  const tags = new Set<string>(["files"]);
  const normalizedPath = normalizeSearchValue(node.path);

  if (node.kind === "directory") {
    tags.add("folders");
  }

  if (normalizedPath.includes("media photography")) {
    tags.add("photos");
  }

  if (normalizedPath.includes("media music")) {
    tags.add("music");
  }

  if (normalizedPath.includes("portfolio case studies")) {
    tags.add("projects");
  }

  if (normalizedPath.includes("users public blog")) {
    tags.add("projects");
    tags.add("portfolio");
  }

  if (normalizedPath.includes("documents notes") || isNotesPath(node.path)) {
    tags.add("notes");
  }

  if (node.kind === "file") {
    const association = getFileAssociationDescriptor(node.extension);
    if (association?.family) {
      tags.add(association.family);
    }

    if (association?.family === "audio") {
      tags.add("music");
    }

    if (association?.family === "image") {
      tags.add("photos");
    }

    if (association?.family === "video") {
      tags.add("video");
    }

    if (association?.family === "document" || association?.family === "text") {
      tags.add("documents");
    }

    if (node.path === "/Documents/Taaniel-Vananurm-CV.pdf") {
      tags.add("resume");
      tags.add("portfolio");
    }
  }

  return [...tags];
}

function resolveNodeAliases(node: VirtualNode) {
  const aliases = [humanizeLabel(node.name), humanizeLabel(node.path.split("/").filter(Boolean).at(-1) ?? node.name)];

  if (node.kind === "directory") {
    if (node.path === "/Media/Photography") {
      aliases.push("photo gallery", "pictures", "portfolio photos");
    }

    if (node.path === "/Media/Music") {
      aliases.push("songs", "tracks", "playlist");
    }

    if (node.path === "/Portfolio/Case Studies") {
      aliases.push("projects", "case studies", "portfolio work");
    }
  }

  if (node.kind === "file" && isNotesPath(node.path)) {
    aliases.push("note", "notes", "memo");
  }

  return uniqueTerms(aliases);
}

function buildIntent(rawQuery: string): SearchIntent {
  const normalizedQuery = normalizeSearchValue(rawQuery);
  const rawTokens = tokenize(rawQuery);
  const verbs = rawTokens.filter((token) => searchVerbs.has(token));
  const tokens = rawTokens.filter((token) => !searchVerbs.has(token));
  const expandedTerms = new Set<string>(tokens);
  const semanticTags = new Set<string>();

  intentGroups.forEach((group) => {
    const matched = group.terms.some((term) => normalizedQuery.includes(normalizeSearchValue(term)));

    if (!matched) {
      return;
    }

    semanticTags.add(group.tag);
    group.terms.forEach((term) => {
      tokenize(term).forEach((token) => expandedTerms.add(token));
    });
  });

  if (tokens.length === 0) {
    verbs.forEach((verb) => expandedTerms.add(verb));
  }

  return {
    normalizedQuery,
    titleQuery: normalizedQuery,
    tokens: tokens.length > 0 ? tokens : rawTokens,
    expandedTerms: [...expandedTerms],
    semanticTags: [...semanticTags],
    verbs,
  };
}

function tokenPrefixMatch(values: string[], token: string) {
  return values.some((value) => value.startsWith(token));
}

function resolveActionBonus(entry: ShellSearchEntry, intent: SearchIntent) {
  let bonus = 0;

  if (intent.verbs.length > 0) {
    bonus += 16;
  }

  if (intent.semanticTags.includes("folders") && entry.type === "folder") {
    bonus += 90;
  }

  if (intent.semanticTags.includes("apps") && entry.type === "app") {
    bonus += 90;
  }

  if (intent.semanticTags.includes("notes") && entry.semanticTags.includes("notes")) {
    bonus += 90;
  }

  if (intent.semanticTags.includes("projects") && entry.semanticTags.includes("projects")) {
    bonus += 88;
  }

  if (intent.semanticTags.includes("photos") && entry.semanticTags.includes("photos")) {
    bonus += 86;
  }

  if (intent.semanticTags.includes("music") && entry.semanticTags.includes("music")) {
    bonus += 86;
  }

  if (intent.semanticTags.includes("contact") && entry.semanticTags.includes("contact")) {
    bonus += 80;
  }

  if (intent.semanticTags.includes("resume") && entry.semanticTags.includes("resume")) {
    bonus += 84;
  }

  if (intent.semanticTags.includes("browser") && (entry.section === "links" || entry.semanticTags.includes("browser"))) {
    bonus += 76;
  }

  return bonus;
}

function resolvePreview(previewText: string | undefined, intent: SearchIntent) {
  if (!previewText) {
    return undefined;
  }

  const normalizedPreview = normalizeSearchValue(previewText);
  const matchToken = intent.tokens.find((token) => normalizedPreview.includes(token)) ?? intent.expandedTerms.find((token) => normalizedPreview.includes(token));

  if (!matchToken) {
    return previewText.slice(0, 116);
  }

  const source = previewText.replace(/\s+/g, " ").trim();
  const lowerSource = source.toLowerCase();
  const matchIndex = lowerSource.indexOf(matchToken.toLowerCase());

  if (matchIndex === -1) {
    return source.slice(0, 116);
  }

  const start = Math.max(0, matchIndex - 28);
  const end = Math.min(source.length, matchIndex + 88);
  const snippet = source.slice(start, end).trim();

  return `${start > 0 ? "..." : ""}${snippet}${end < source.length ? "..." : ""}`;
}

function scoreEntry(entry: ShellSearchEntry, intent: SearchIntent): ShellSearchResult | null {
  if (!intent.normalizedQuery) {
    return null;
  }

  const normalizedTitle = normalizeSearchValue(entry.title);
  const normalizedSubtitle = normalizeSearchValue(entry.subtitle);
  const aliasTerms = entry.aliases.flatMap(tokenize);
  const titleTerms = tokenize(entry.title);
  const searchableText = entry.tokens;
  const normalizedPreview = entry.previewText ? normalizeSearchValue(entry.previewText) : "";
  const matchedTerms = new Set<string>();

  let score = 0;
  let matchMode: ShellSearchMatchMode = "keyword";

  if (
    normalizedTitle === intent.titleQuery ||
    entry.aliases.some((alias) => normalizeSearchValue(alias) === intent.titleQuery)
  ) {
    score += 920;
    matchMode = "exact";
  }

  if (normalizedTitle.startsWith(intent.titleQuery)) {
    score += 360;
  } else if (normalizedTitle.includes(intent.titleQuery)) {
    score += 240;
  }

  if (normalizedSubtitle.startsWith(intent.titleQuery)) {
    score += 140;
  } else if (normalizedSubtitle.includes(intent.titleQuery)) {
    score += 90;
  }

  if (normalizedPreview.includes(intent.titleQuery)) {
    score += 320;
    if (matchMode !== "exact") {
      matchMode = "semantic";
    }
  }

  intent.tokens.forEach((token) => {
    if (titleTerms.includes(token)) {
      score += 140;
      matchedTerms.add(token);
      return;
    }

    if (aliasTerms.includes(token)) {
      score += 120;
      matchedTerms.add(token);
      return;
    }

    if (tokenPrefixMatch(titleTerms, token) || tokenPrefixMatch(aliasTerms, token)) {
      score += 78;
      matchedTerms.add(token);
      return;
    }

    if (searchableText.includes(token)) {
      score += 54;
      matchedTerms.add(token);
    }
  });

  intent.expandedTerms.forEach((term) => {
    if (intent.tokens.includes(term)) {
      return;
    }

    if (searchableText.includes(term)) {
      score += 24;
    }
  });

  const semanticOverlap = intent.semanticTags.filter((tag) => entry.semanticTags.includes(tag));

  if (semanticOverlap.length > 0) {
    score += semanticOverlap.length * 52;
    if (matchMode !== "exact") {
      matchMode = "semantic";
    }
  }

  score += resolveActionBonus(entry, intent);

  if (intent.tokens.length > 1) {
    const coverage =
      intent.tokens.filter((token) => searchableText.includes(token)).length / intent.tokens.length;
    score += Math.round(coverage * 120);

    if (coverage >= 0.66 && matchMode !== "exact") {
      matchMode = "semantic";
    }
  }

  if (
    normalizedPreview &&
    intent.tokens.length > 0 &&
    intent.tokens.every((token) => normalizedPreview.includes(token))
  ) {
    score += 180;
    if (matchMode !== "exact") {
      matchMode = "semantic";
    }
  }

  if (score <= 0) {
    return null;
  }

  return {
    ...entry,
    score,
    matchMode,
    matchedTerms: [...matchedTerms],
    preview: resolvePreview(entry.previewText, intent),
  };
}

function buildAppEntries(apps: AppDefinition[]) {
  return apps.map<ShellSearchEntry>((app) => {
    const aliases = uniqueTerms([
      app.id,
      ...app.category.split(/\s+/),
      ...(appAliases[app.id] ?? []),
    ]);

    const semanticTags = uniqueTerms([
      app.category.toLowerCase(),
      app.id,
      ...aliases.flatMap(tokenize),
    ]);

    const entry: ShellSearchEntry = {
      id: `app:${app.id}`,
      section: "apps",
      type: "app",
      title: app.title,
      subtitle: app.category,
      icon: app.icon,
      accent: app.accent,
      action: { type: "launch-app", appId: app.id },
      actionLabel: "Open app",
      aliases,
      semanticTags,
      tokens: joinSearchParts(app.title, app.description, app.category, aliases.join(" ")),
    };

    return entry;
  });
}

function buildFileEntries(nodes: FileSystemRecord) {
  return Object.values(nodes)
    .filter((node) => node.path !== "/")
    .map<ShellSearchEntry>((node) => {
      const normalizedName = humanizeLabel(node.name);
      const previewText =
        node.kind === "file" &&
        typeof node.content === "string" &&
        isTextLikeExtension(node.extension)
          ? clampContentPreview(node.content)
          : undefined;
      const associationLabel = node.kind === "file" ? getFileAssociationDescriptor(node.extension)?.label : undefined;
      const entry: ShellSearchEntry = {
        id: `node:${node.path}`,
        section: "files",
        type: node.kind === "directory" ? "folder" : "file",
        title: normalizedName || node.name,
        subtitle: formatSearchPath(node.path),
        action: { type: "open-path", path: node.path },
        actionLabel: node.kind === "directory" ? "Open folder" : "Open file",
        aliases: resolveNodeAliases(node),
        semanticTags: resolveNodeSemanticTags(node),
        previewText,
        tokens: joinSearchParts(
          node.name,
          normalizedName,
          node.path,
          associationLabel,
          resolveNodeAliases(node).join(" "),
          resolveNodeSemanticTags(node).join(" "),
          previewText
        ),
      };

      return entry;
    });
}

function buildLinkEntries() {
  return socialLinks.map<ShellSearchEntry>((link) => ({
    id: `link:${link.label}`,
    section: "links",
    type: "link",
    title: link.label,
    subtitle: formatSearchLink(link.url),
    action: { type: "open-external", url: link.url },
    actionLabel: "Open link",
    aliases: [formatSearchLink(link.url), "social link"],
    semanticTags: ["browser", "contact", "links", "social"],
    tokens: joinSearchParts(link.label, link.url, formatSearchLink(link.url), "social link profile"),
  }));
}

function buildPortfolioEntries(nodes: FileSystemRecord) {
  const entries: ShellSearchEntry[] = [
    {
      id: "portfolio:about",
      section: "portfolio",
      type: "portfolio",
      title: "About",
      subtitle: profile.role,
      action: { type: "launch-app", appId: "about" },
      actionLabel: "Jump to section",
      aliases: ["profile", "bio", "skills", "about me"],
      semanticTags: ["portfolio", "projects", "about", "contact"],
      tokens: joinSearchParts(
        profile.name,
        profile.role,
        profile.shortRole,
        profile.headline,
        profile.intro,
        profile.current,
        profile.availability,
        profile.location,
        skills.join(" "),
        quickStats.map((stat) => `${stat.label} ${stat.value}`).join(" ")
      ),
    },
    {
      id: "portfolio:resume",
      section: "portfolio",
      type: "portfolio",
      title: "Resume",
      subtitle: "CV / PDF",
      action: { type: "open-path", path: "/Documents/Taaniel-Vananurm-CV.pdf" },
      actionLabel: "Open file",
      aliases: ["cv", "resume pdf"],
      semanticTags: ["portfolio", "resume", "files"],
      tokens: joinSearchParts("resume cv pdf taaniel vananurm"),
    },
    {
      id: "portfolio:case-studies",
      section: "portfolio",
      type: "portfolio",
      title: "Case Studies",
      subtitle: "Project folders and writeups",
      action: { type: "open-path", path: "/Portfolio/Case Studies" },
      actionLabel: "Open folder",
      aliases: ["projects folder", "portfolio work", "case study directory"],
      semanticTags: ["portfolio", "projects", "folders"],
      tokens: joinSearchParts("case studies portfolio work project writeups"),
    },
    {
      id: "portfolio:photography",
      section: "portfolio",
      type: "portfolio",
      title: "Photography",
      subtitle: "Images and media library",
      action: { type: "open-path", path: "/Media/Photography" },
      actionLabel: "Open folder",
      aliases: ["photo gallery", "pictures", "photos"],
      semanticTags: ["portfolio", "photos", "folders"],
      tokens: joinSearchParts(
        "photography photo gallery pictures images",
        photographyAssets.map((asset) => asset.title).join(" ")
      ),
    },
    {
      id: "portfolio:contact",
      section: "portfolio",
      type: "portfolio",
      title: "Contact",
      subtitle: profile.emailText,
      action: { type: "launch-app", appId: "contact" },
      actionLabel: "Jump to section",
      aliases: ["email", "phone", "social links"],
      semanticTags: ["portfolio", "contact"],
      tokens: joinSearchParts(profile.emailText, profile.phoneText, profile.location, "contact email phone"),
    },
  ];

  featuredProjects.forEach((project) => {
    entries.push({
      id: `portfolio:${project.id}`,
      section: "portfolio",
      type: "portfolio",
      title: project.title,
      subtitle: project.type,
      action: { type: "launch-app", appId: "projects", payload: { projectId: project.id } },
      actionLabel: "Jump to project",
      aliases: ["case study", "project", ...project.stack],
      semanticTags: ["portfolio", "projects"],
      previewText: clampContentPreview(`${project.oneLiner} ${project.challenge} ${project.outcome}`),
      tokens: joinSearchParts(
        project.title,
        project.type,
        project.oneLiner,
        project.role,
        project.challenge,
        project.outcome,
        project.stack.join(" ")
      ),
    });
  });

  const aboutNode = nodes["/Portfolio/About.md"];
  if (aboutNode?.kind === "file" && typeof aboutNode.content === "string") {
    entries.push({
      id: "portfolio:about-file",
      section: "portfolio",
      type: "portfolio",
      title: "About.md",
      subtitle: "Portfolio profile document",
      action: { type: "open-path", path: aboutNode.path },
      actionLabel: "Open file",
      aliases: ["profile document", "about doc"],
      semanticTags: ["portfolio", "files"],
      previewText: clampContentPreview(aboutNode.content),
      tokens: joinSearchParts(aboutNode.name, aboutNode.content, "about profile skills availability"),
    });
  }

  return entries;
}

export function buildShellSearchIndex(nodes: FileSystemRecord): ShellSearchIndex {
  const apps = getAppRegistry();
  const appEntries = buildAppEntries(apps);
  const fileEntries = buildFileEntries(nodes);
  const linkEntries = buildLinkEntries();
  const portfolioEntries = buildPortfolioEntries(nodes);

  return {
    apps: appEntries,
    files: fileEntries,
    links: linkEntries,
    portfolio: portfolioEntries,
    all: [...appEntries, ...fileEntries, ...linkEntries, ...portfolioEntries],
  };
}

function getDefaultFileResults(entries: ShellSearchEntry[]) {
  const suggestions = defaultFileSuggestions
    .map((path) =>
      entries.find((entry) => entry.action.type === "open-path" && entry.action.path === path)
    )
    .filter((entry): entry is ShellSearchEntry => Boolean(entry));

  if (suggestions.length > 0) {
    return suggestions;
  }

  return entries.slice(0, 4);
}

export function queryShellSearch(index: ShellSearchIndex, rawQuery: string): ShellSearchSection[] {
  const intent = buildIntent(rawQuery);

  if (!intent.normalizedQuery) {
    return [
      {
        id: "apps",
        ...sectionLabels.apps,
        results: index.apps.slice(0, 6).map((entry) => ({
          ...entry,
          score: 0,
          matchMode: "keyword" as const,
          matchedTerms: [],
        })),
      },
      {
        id: "files",
        ...sectionLabels.files,
        results: getDefaultFileResults(index.files).map((entry) => ({
          ...entry,
          score: 0,
          matchMode: "keyword" as const,
          matchedTerms: [],
        })),
      },
      {
        id: "links",
        ...sectionLabels.links,
        results: index.links.slice(0, 4).map((entry) => ({
          ...entry,
          score: 0,
          matchMode: "keyword" as const,
          matchedTerms: [],
        })),
      },
      {
        id: "portfolio",
        ...sectionLabels.portfolio,
        results: index.portfolio.slice(0, 5).map((entry) => ({
          ...entry,
          score: 0,
          matchMode: "keyword" as const,
          matchedTerms: [],
        })),
      },
    ];
  }

  const resultsBySection = new Map<ShellSearchSectionId, ShellSearchResult[]>(
    (["apps", "files", "links", "portfolio"] as ShellSearchSectionId[]).map((sectionId) => [sectionId, []])
  );

  index.all.forEach((entry) => {
    const result = scoreEntry(entry, intent);

    if (!result) {
      return;
    }

    resultsBySection.get(entry.section)?.push(result);
  });

  return (["apps", "files", "links", "portfolio"] as ShellSearchSectionId[]).map((sectionId) => ({
    id: sectionId,
    ...sectionLabels[sectionId],
    results: (resultsBySection.get(sectionId) ?? []).sort(compareResults).slice(0, 6),
  }));
}

export function flattenShellSearchResults(sections: ShellSearchSection[]) {
  return sections.flatMap((section) => section.results).sort(compareResults);
}

export function getTopSearchResult(sections: ShellSearchSection[]) {
  return flattenShellSearchResults(sections)[0] ?? null;
}

function buildAiCandidateContent(result: ShellSearchResult) {
  return joinSearchParts(
    result.title,
    result.subtitle,
    result.previewText,
    result.preview,
    result.tokens,
    result.aliases.join(" "),
    result.semanticTags.join(" ")
  );
}

export function buildShellSearchAiCandidates(
  sections: ShellSearchSection[],
  limit = 18
): ShellSearchAiCandidate[] {
  return flattenShellSearchResults(sections)
    .slice(0, limit)
    .map((result) => ({
      id: result.id,
      title: result.title,
      content: buildAiCandidateContent(result),
      score: result.score,
      matchMode: result.matchMode,
    }));
}

export function applyShellSearchAiRankings(
  sections: ShellSearchSection[],
  rankings: ShellSearchAiRanking[]
) {
  if (rankings.length === 0) {
    return sections;
  }

  const rankingMap = new Map(rankings.map((ranking) => [ranking.id, ranking.similarity]));

  return sections.map((section) => ({
    ...section,
    results: [...section.results]
      .map((result) => {
        const similarity = rankingMap.get(result.id);

        if (similarity === undefined) {
          return result;
        }

        const aiBoost =
          result.matchMode === "exact"
            ? Math.round(Math.max(0, similarity) * 38)
            : Math.round(Math.max(0, similarity) * 240);

        return {
          ...result,
          score: result.score + aiBoost,
          matchMode: (
            result.matchMode === "exact"
              ? "exact"
              : similarity >= 0.42
                ? "semantic"
                : result.matchMode
          ) as ShellSearchMatchMode,
        };
      })
      .sort(compareResults),
  }));
}
