import {
  featuredProjects,
  photographyAssets,
  profile,
  quickStats,
  resumePdfPath,
  skills,
  socialLinks,
} from "@/data/portfolio";
import {
  bundledWorkspaceAssets,
  bundledWorkspaceDirectories,
} from "@/data/bundled-assets";
import { getImageFileMetaFromUrl } from "@/lib/image-path";
import { GAMES_README_CONTENT, GAMES_README_PATH } from "@/lib/games";
import { DEFAULT_NOTE_CONTENT, DEFAULT_NOTE_NAME, NOTES_DIRECTORY_PATH } from "@/lib/notes";
import type { FileSystemRecord, VirtualDirectory, VirtualFile } from "@/types/system";

const now = Date.now();

const directory = (path: string): VirtualDirectory => {
  const parts = path.split("/").filter(Boolean);
  const name = parts.at(-1) ?? "/";

  return {
    kind: "directory",
    path,
    name,
    createdAt: now,
    updatedAt: now,
  };
};

const file = (path: string, extension: string, mimeType: string, partial: Partial<VirtualFile>): VirtualFile => {
  const name = path.split("/").filter(Boolean).at(-1) ?? path;

  return {
    kind: "file",
    path,
    name,
    extension,
    mimeType,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
};

const aboutMarkdown = `# About Taaniel

${profile.intro}

## Current context

${profile.current}

## Strengths

${skills.map((skill) => `- ${skill}`).join("\n")}

## Availability

${profile.availability}
`;

const contactMarkdown = `# Contact

- **Email:** ${profile.emailText}
- **Phone:** ${profile.phoneText}
- **Location:** ${profile.location}

## Links

${socialLinks.map((link) => `- [${link.label}](${link.url})`).join("\n")}
`;

const uiNotes = `export const portfolioPositioning = {
  shell: "browser desktop as technical sample",
  fastPath: "/simple for recruiters",
  focus: ["React", "TypeScript", "UI systems", "design-to-code"],
};
`;

const labReadme = `# Lab

Games, music, paint, and experimental apps are grouped under **Start → Lab** so the default desktop stays focused on About, Projects, Resume, and Contact.

Use this folder as a reminder: everything in Lab is optional exploration, not required to evaluate my frontend work.
`;

const buildJournalMarkdown = `# Building a Portfolio OS

Turning a portfolio into a desktop-style product changes the expectation from "scroll and skim" to "explore and inspect".

## Why it matters

- It demonstrates interface architecture, not just visual taste.
- It shows how content can live inside a system instead of beside it.
- It gives recruiters more than screenshots. They can feel the product thinking directly.
`;

const frontendNotesMarkdown = `# Frontend Notes

## Principles I care about

- Interface clarity before visual noise
- Motion that explains state, not motion for its own sake
- Design systems that still feel authored
- Fast iteration from concept to implementation

## What this OS portfolio is trying to prove

That frontend craft can be expressive, technical, and recruiter-friendly at the same time.
`;

export const buildSeedFileSystem = (): FileSystemRecord => {
  const nodes: FileSystemRecord = {
    "/": directory("/"),
    "/Desktop": directory("/Desktop"),
    "/Documents": directory("/Documents"),
    [NOTES_DIRECTORY_PATH]: directory(NOTES_DIRECTORY_PATH),
    "/Users": directory("/Users"),
    "/Users/Public": directory("/Users/Public"),
    "/Users/Public/Lab": directory("/Users/Public/Lab"),
    "/Users/Public/Blog": directory("/Users/Public/Blog"),
    "/Portfolio": directory("/Portfolio"),
    "/Portfolio/Case Studies": directory("/Portfolio/Case Studies"),
    "/Games": directory("/Games"),
    "/Media": directory("/Media"),
    "/Media/Music": directory("/Media/Music"),
    "/Media/Photography": directory("/Media/Photography"),
    "/Media/Videos": directory("/Media/Videos"),
    "/Code": directory("/Code"),
  };

  bundledWorkspaceDirectories.forEach((path) => {
    nodes[path] = directory(path);
  });

  nodes[`${NOTES_DIRECTORY_PATH}/${DEFAULT_NOTE_NAME}`] = file(
    `${NOTES_DIRECTORY_PATH}/${DEFAULT_NOTE_NAME}`,
    "txt",
    "text/plain",
    {
      content: DEFAULT_NOTE_CONTENT,
    }
  );

  nodes["/Portfolio/About.md"] = file("/Portfolio/About.md", "md", "text/markdown", {
    content: aboutMarkdown,
  });

  nodes["/Portfolio/Contact.md"] = file("/Portfolio/Contact.md", "md", "text/markdown", {
    content: contactMarkdown,
  });

  nodes["/Code/portfolio-positioning.ts"] = file(
    "/Code/portfolio-positioning.ts",
    "ts",
    "text/typescript",
    { content: uiNotes }
  );

  nodes["/Users/Public/Blog/Building-a-Portfolio-OS.md"] = file(
    "/Users/Public/Blog/Building-a-Portfolio-OS.md",
    "md",
    "text/markdown",
    { content: buildJournalMarkdown }
  );

  nodes["/Users/Public/Blog/Frontend-Notes.md"] = file(
    "/Users/Public/Blog/Frontend-Notes.md",
    "md",
    "text/markdown",
    { content: frontendNotesMarkdown }
  );

  nodes[GAMES_README_PATH] = file(GAMES_README_PATH, "md", "text/markdown", {
    content: GAMES_README_CONTENT,
  });

  nodes["/Users/Public/Lab/README.md"] = file("/Users/Public/Lab/README.md", "md", "text/markdown", {
    content: labReadme,
  });

  nodes["/Documents/Taaniel-Vananurm-CV.pdf"] = file(
    "/Documents/Taaniel-Vananurm-CV.pdf",
    "pdf",
    "application/pdf",
    {
      source: resumePdfPath,
      readonly: true,
    }
  );

  featuredProjects.forEach((project) => {
    const directoryPath = `/Portfolio/Case Studies/${project.title}`;
    nodes[directoryPath] = directory(directoryPath);

    const extraSections = [
      project.problem ? `## Problem\n\n${project.problem}` : "",
      project.architecture?.length
        ? `## Architecture\n\n${project.architecture.map((a) => `### ${a.title}\n\n${a.body}`).join("\n\n")}`
        : "",
      project.technicalHighlights?.length
        ? `## Technical highlights\n\n${project.technicalHighlights.map((h) => `- ${h}`).join("\n")}`
        : "",
      project.challengesAndTradeoffs ? `## Challenges and tradeoffs\n\n${project.challengesAndTradeoffs}` : "",
      project.whatILearned ? `## What I learned\n\n${project.whatILearned}` : "",
      project.measurableOutcome ? `## Measurable outcome\n\n${project.measurableOutcome}` : "",
      project.liveUrl ? `## Live\n\n${project.liveUrl}` : "",
      project.repoUrl ? `## Repository\n\n${project.repoUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    nodes[`${directoryPath}/Overview.md`] = file(
      `${directoryPath}/Overview.md`,
      "md",
      "text/markdown",
      {
        content: `# ${project.title}

## Type

${project.type}

## Role

${project.role}

## One-line summary

${project.oneLiner}

## Challenge

${project.challenge}

## Outcome

${project.outcome}

${extraSections ? `${extraSections}\n\n` : ""}## Stack

${project.stack.map((item) => `- ${item}`).join("\n")}
`,
      }
    );

    const heroMeta = getImageFileMetaFromUrl(project.hero);
    nodes[`${directoryPath}/Hero.${heroMeta.extension}`] = file(
      `${directoryPath}/Hero.${heroMeta.extension}`,
      heroMeta.extension,
      heroMeta.mimeType,
      {
        source: project.hero,
        readonly: true,
      }
    );

    project.layouts.forEach((layout, index) => {
      const meta = getImageFileMetaFromUrl(layout);
      nodes[`${directoryPath}/Layout-${index + 1}.${meta.extension}`] = file(
        `${directoryPath}/Layout-${index + 1}.${meta.extension}`,
        meta.extension,
        meta.mimeType,
        {
          source: layout,
          readonly: true,
        }
      );
    });
  });

  photographyAssets.forEach((asset) => {
    const extension = asset.src.endsWith(".png") ? "png" : "jpg";
    nodes[`/Media/Photography/${asset.title}.${extension}`] = file(
      `/Media/Photography/${asset.title}.${extension}`,
      extension,
      extension === "png" ? "image/png" : "image/jpeg",
      {
        source: asset.src,
        readonly: true,
      }
    );
  });

  bundledWorkspaceAssets.forEach((asset) => {
    nodes[asset.path] = file(asset.path, asset.extension, asset.mimeType, {
      source: asset.source,
      readonly: true,
    });
  });

  return nodes;
};
