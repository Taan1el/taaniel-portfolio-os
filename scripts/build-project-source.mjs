// Packs every tracked file into public/project-source.json, which the Code app opens as a project.
// Text comes with its content. Everything else is listed by path, so the tree matches the repo.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const OUTPUT = "public/project-source.json";
const MAX_FILE_BYTES = 256 * 1024;
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|pdf|wasm|bin|iso|img|mp3|mp4|webm|ogg|wav|woff2?|ttf|otf|wad|zip|gz|7z)$/i;

/** The lockfile is text, but it would be a large part of the download and nobody reads it. */
export function hasReadableText(path) {
  return path !== "package-lock.json" && !BINARY.test(path);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
}

function main() {
  const files = {};
  const listed = [];

  for (const path of git("ls-files").split("\n")) {
    const text = hasReadableText(path) && statSync(path).size <= MAX_FILE_BYTES ? readFileSync(path, "utf8") : "\0";
    if (text.includes("\0")) listed.push(path);
    else files[path] = text;
  }

  writeFileSync(OUTPUT, JSON.stringify({ branch: "main", commit: git("rev-parse", "--short", "HEAD"), files, listed }));
  console.log(`${OUTPUT}: ${Object.keys(files).length} files with text, ${listed.length} listed`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
