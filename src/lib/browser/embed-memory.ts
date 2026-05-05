export type BrowserEmbedOutcome = "ready" | "blocked" | "timeout" | "error";

interface BrowserEmbedHostRecord {
  directOutcome?: BrowserEmbedOutcome;
  directUpdatedAt?: number;
}

type BrowserEmbedMemory = Record<string, BrowserEmbedHostRecord>;

const STORAGE_KEY = "portfolio-browser-embed-memory";
const MAX_RECORD_AGE_MS = 1000 * 60 * 60 * 24 * 14;

function normalizeHostname(inputUrl: string) {
  try {
    return new URL(inputUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function readMemory(): BrowserEmbedMemory {
  if (typeof localStorage === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as BrowserEmbedMemory) : {};
  } catch {
    return {};
  }
}

function writeMemory(memory: BrowserEmbedMemory) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Ignore localStorage failures. The viewer should still work without persistence.
  }
}

export function getStoredDirectEmbedOutcome(inputUrl: string) {
  const hostname = normalizeHostname(inputUrl);

  if (!hostname) {
    return null;
  }

  const record = readMemory()[hostname];

  if (!record?.directOutcome || !record.directUpdatedAt) {
    return null;
  }

  if (Date.now() - record.directUpdatedAt > MAX_RECORD_AGE_MS) {
    return null;
  }

  return record.directOutcome;
}

export function rememberDirectEmbedOutcome(
  inputUrl: string,
  outcome: BrowserEmbedOutcome,
) {
  const hostname = normalizeHostname(inputUrl);

  if (!hostname) {
    return;
  }

  const current = readMemory();
  current[hostname] = {
    ...current[hostname],
    directOutcome: outcome,
    directUpdatedAt: Date.now(),
  };
  writeMemory(current);
}
