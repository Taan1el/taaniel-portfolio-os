import { featuredProjects, profile, quickStats, skills, socialLinks, themePresets } from "@/data/portfolio";
import { getAppRegistry } from "@/lib/app-registry";
import { getPathName, normalizePath } from "@/lib/filesystem";
import type {
  AppId,
  FileNode,
  FileSystemRecord,
  WindowPayload,
} from "@/types/system";

export const TERMINAL_HOME_PATH = "/Desktop";

type TerminalAction =
  | { type: "launch-app"; appId: AppId; payload?: WindowPayload; title?: string }
  | { type: "open-path"; path: string };

interface TerminalCommandContext {
  currentPath: string;
  nodes: FileSystemRecord;
  listDirectory: (path: string) => FileNode[];
  readFile: (path: string) => FileNode | null;
}

export interface TerminalCommandResult {
  lines: string[];
  nextPath?: string;
  clear?: boolean;
  actions?: TerminalAction[];
}

const APP_ALIASES: Partial<Record<AppId, string[]>> = {
  about: ["profile", "bio"],
  browser: ["web", "internet"],
  contact: ["email", "phone", "socials"],
  files: ["explorer", "folders", "filesystem"],
  music: ["songs", "audio", "playlist"],
  notes: ["memo", "notepad"],
  photos: ["gallery", "images", "pictures"],
  projects: ["work", "case-studies", "case studies"],
  settings: ["preferences"],
  terminal: ["shell", "console"],
};

const PATH_SHORTCUTS: Record<string, string> = {
  blog: "/Users/Public/Blog",
  cv: "/Documents/Taaniel-Vananurm-CV.pdf",
  music: "/Media/Music",
  photos: "/Media/Photography",
  photography: "/Media/Photography",
  projects: "/Portfolio/Case Studies",
  resume: "/Documents/Taaniel-Vananurm-CV.pdf",
};

const COMMAND_HELP = [
  "help                 show available commands",
  "ls [path]            list files and folders",
  "cd [path]            change the current folder",
  "pwd                  print the current path",
  "cat <file>           print a text file",
  "open <path|app>      open a file, folder, or app",
  "clear                clear the terminal screen",
  "whoami               print the portfolio summary",
  "about                open the About app and print a summary",
  "projects [name]      list or jump to project work",
  "contact              open contact details",
];

function parseCommandInput(input: string) {
  const matches = input.match(/"([^"]+)"|'([^']+)'|(\S+)/g) ?? [];
  const parts = matches.map((part) => part.replace(/^['"]|['"]$/g, ""));
  const [command = "", ...args] = parts;

  return {
    command: command.toLowerCase(),
    args,
  };
}

function resolveTerminalPath(input: string | undefined, currentPath: string) {
  if (!input || input === ".") {
    return currentPath;
  }

  if (input === "~") {
    return TERMINAL_HOME_PATH;
  }

  const seed = input.startsWith("/") ? [] : currentPath.split("/").filter(Boolean);
  const resolvedSegments = [...seed];

  input
    .split("/")
    .filter(Boolean)
    .forEach((segment) => {
      if (segment === ".") {
        return;
      }

      if (segment === "..") {
        resolvedSegments.pop();
        return;
      }

      resolvedSegments.push(segment);
    });

  return normalizePath(`/${resolvedSegments.join("/")}`);
}

function humanizeNode(node: FileNode) {
  if (node.type === "folder") {
    return `dir   ${node.name}/`;
  }

  return `file  ${node.name}`;
}

function findAppMatch(input: string) {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const apps = getAppRegistry();
  const exactMatch =
    apps.find((app) => app.id === normalized) ??
    apps.find((app) => app.title.toLowerCase() === normalized) ??
    apps.find((app) => (APP_ALIASES[app.id] ?? []).includes(normalized));

  if (exactMatch) {
    return exactMatch;
  }

  return (
    apps.find((app) => app.title.toLowerCase().includes(normalized)) ??
    apps.find((app) => app.id.includes(normalized)) ??
    null
  );
}

function findProjectMatch(input: string | undefined) {
  if (!input) {
    return null;
  }

  const normalized = input.trim().toLowerCase();

  return (
    featuredProjects.find((project) => project.id.toLowerCase() === normalized) ??
    featuredProjects.find((project) => project.title.toLowerCase() === normalized) ??
    featuredProjects.find((project) => project.title.toLowerCase().includes(normalized)) ??
    null
  );
}

function createPathOpenAction(path: string): TerminalAction {
  return {
    type: "open-path",
    path,
  };
}

function createAppLaunchAction(appId: AppId, payload?: WindowPayload, title?: string): TerminalAction {
  return {
    type: "launch-app",
    appId,
    payload,
    title,
  };
}

function handleHelp(): TerminalCommandResult {
  return {
    lines: ["Available commands", ...COMMAND_HELP],
  };
}

function handleLs(context: TerminalCommandContext, target?: string): TerminalCommandResult {
  const path = resolveTerminalPath(target, context.currentPath);
  const node = context.nodes[path];

  if (!node || node.kind !== "directory") {
    return {
      lines: [`Directory not found: ${path}`],
    };
  }

  const children = context.listDirectory(path);

  if (children.length === 0) {
    return {
      lines: [`${path} is empty.`],
    };
  }

  return {
    lines: children.map(humanizeNode),
  };
}

function handleCd(context: TerminalCommandContext, target?: string): TerminalCommandResult {
  const nextPath = resolveTerminalPath(target ?? TERMINAL_HOME_PATH, context.currentPath);
  const node = context.nodes[nextPath];

  if (!node || node.kind !== "directory") {
    return {
      lines: [`Directory not found: ${nextPath}`],
    };
  }

  return {
    lines: [],
    nextPath,
  };
}

function handleCat(context: TerminalCommandContext, target?: string): TerminalCommandResult {
  if (!target) {
    return {
      lines: ["Usage: cat <file>"],
    };
  }

  const path = resolveTerminalPath(target, context.currentPath);
  const node = context.readFile(path);

  if (!node) {
    return {
      lines: [`File not found: ${path}`],
    };
  }

  if (typeof node.content !== "string") {
    return {
      lines: [`${getPathName(path)} is not a text file. Use \`open ${target}\` instead.`],
    };
  }

  return {
    lines: node.content.split(/\r?\n/),
  };
}

function handleOpen(context: TerminalCommandContext, targetParts: string[]): TerminalCommandResult {
  const target = targetParts.join(" ").trim();

  if (!target) {
    return {
      lines: ["Usage: open <path|app>"],
    };
  }

  const path = resolveTerminalPath(target, context.currentPath);

  if (context.nodes[path]) {
    return {
      lines: [`Opened ${path}`],
      actions: [createPathOpenAction(path)],
    };
  }

  const shortcutPath = PATH_SHORTCUTS[target.toLowerCase()];

  if (shortcutPath && context.nodes[shortcutPath]) {
    return {
      lines: [`Opened ${shortcutPath}`],
      actions: [createPathOpenAction(shortcutPath)],
    };
  }

  const app = findAppMatch(target);

  if (app) {
    return {
      lines: [`Opened ${app.title}`],
      actions: [createAppLaunchAction(app.id)],
    };
  }

  const project = findProjectMatch(target);

  if (project) {
    return {
      lines: [`Opened ${project.title}`],
      actions: [
        createAppLaunchAction("projects", {
          projectId: project.id,
        }),
      ],
    };
  }

  return {
    lines: [`No file, folder, app, or project matched "${target}".`],
  };
}

function handleWhoAmI(): TerminalCommandResult {
  return {
    lines: [
      profile.name,
      profile.role,
      profile.intro,
      `Current: ${profile.current}`,
      `Availability: ${profile.availability}`,
      "",
      ...quickStats.map((stat) => `${stat.label}: ${stat.value}`),
      "",
      `Skills: ${skills.join(", ")}`,
    ],
  };
}

function handleAbout(): TerminalCommandResult {
  return {
    lines: [
      `${profile.name} - ${profile.role}`,
      profile.headline,
      `Location: ${profile.location}`,
      `Availability: ${profile.availability}`,
    ],
    actions: [createAppLaunchAction("about")],
  };
}

function handleProjects(targetParts: string[]): TerminalCommandResult {
  const target = targetParts.join(" ").trim();
  const project = findProjectMatch(target);

  if (target && !project) {
    return {
      lines: [`Project not found: ${target}`],
    };
  }

  if (project) {
    return {
      lines: [`Opened ${project.title}`, project.oneLiner],
      actions: [
        createAppLaunchAction("projects", {
          projectId: project.id,
        }),
      ],
    };
  }

  return {
    lines: [
      "Featured projects",
      ...featuredProjects.map((entry) => `- ${entry.id}: ${entry.title}`),
      'Use `projects <name>` to jump to a specific case study.',
    ],
    actions: [createAppLaunchAction("projects")],
  };
}

function handleContact(): TerminalCommandResult {
  return {
    lines: [
      `Email: ${profile.emailText}`,
      `Phone: ${profile.phoneText}`,
      `Location: ${profile.location}`,
      "",
      ...socialLinks.map((link) => `${link.label}: ${link.url}`),
    ],
    actions: [createAppLaunchAction("contact")],
  };
}

function handleThemes(): TerminalCommandResult {
  return {
    lines: themePresets.map((theme) => `${theme.name} (${theme.id})`),
  };
}

export function executeTerminalCommand(
  input: string,
  context: TerminalCommandContext
): TerminalCommandResult {
  const { command, args } = parseCommandInput(input);

  switch (command) {
    case "":
      return { lines: [] };
    case "help":
      return handleHelp();
    case "ls":
      return handleLs(context, args[0]);
    case "cd":
      return handleCd(context, args[0]);
    case "pwd":
      return { lines: [context.currentPath] };
    case "cat":
      return handleCat(context, args[0]);
    case "open":
      return handleOpen(context, args);
    case "clear":
      return { lines: [], clear: true };
    case "whoami":
      return handleWhoAmI();
    case "about":
      return handleAbout();
    case "projects":
      return handleProjects(args);
    case "contact":
      return handleContact();
    case "themes":
      return handleThemes();
    default:
      return {
        lines: [`Unknown command: ${command}`, 'Type `help` to view the available commands.'],
      };
  }
}
