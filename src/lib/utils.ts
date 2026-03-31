export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatClock(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getFileExtension(path: string) {
  const lastSegment = path.split("/").filter(Boolean).at(-1) ?? "";
  const parts = lastSegment.split(".");
  return parts.length > 1 ? parts.at(-1)!.toLowerCase() : "";
}

export function getBaseName(path: string) {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

export function titleCase(value: string) {
  return value
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
