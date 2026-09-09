import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const indexHtml = path.join(dist, "index.html");
const dest = path.join(dist, "404.html");

if (!fs.existsSync(indexHtml)) {
  console.error("copy-404: dist/index.html not found — run vite build first.");
  process.exit(1);
}

fs.copyFileSync(indexHtml, dest);
// A directory entry avoids a 404 response when opening the portfolio directly.
fs.mkdirSync(path.join(dist, "portfolio"), { recursive: true });
fs.copyFileSync(indexHtml, path.join(dist, "portfolio", "index.html"));
console.log("copy-404: wrote dist/404.html for GitHub Pages SPA routing.");
