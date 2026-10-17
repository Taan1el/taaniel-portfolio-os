import {
  createObject,
  formatPropertyValue,
  isShellDate,
  isShellObject,
  type PipelineItem,
  type PropertyValue,
} from "@/lib/terminal-objects";

/*
 * ConvertTo-Json and ConvertFrom-Json for the pipeline's lightweight objects.
 * JSON.parse is the only parser (never eval), and everything it produces is
 * copied into plain data with limits on depth and size, because the text may
 * come from the web or a file.
 */

/** PowerShell's default -Depth for ConvertTo-Json. */
export const DEFAULT_JSON_DEPTH = 2;
export const MAX_JSON_DEPTH = 20;
/** Nodes ConvertFrom-Json copies at most; the rest is dropped. */
const MAX_JSON_NODES = 10_000;
/** Deepest JSON ConvertFrom-Json follows before it shows the rest as text. */
const MAX_PARSE_DEPTH = 32;
const MAX_KEY_LENGTH = 100;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/g;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** One pipeline item or property as plain JSON data, following objects down `depth` levels. */
export function toJsonValue(value: PipelineItem | PropertyValue | undefined, depth: number): JsonValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (isShellDate(value)) {
    const date = new Date(value.time);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (isShellObject(value)) {
    // Past the depth limit PowerShell writes the object's text instead of its members.
    if (depth < 0) return value.text;
    const result: { [key: string]: JsonValue } = Object.create(null);
    for (const [key, member] of Object.entries(value.properties)) result[key] = toJsonValue(member, depth - 1);
    return result;
  }
  return null;
}

export interface JsonOptions {
  depth: number;
  compress: boolean;
  /** -AsArray: a single item is still written as an array. */
  asArray?: boolean;
}

/** The text ConvertTo-Json prints for the piped items: one item as itself, several as an array. */
export function itemsToJson(items: PipelineItem[], options: JsonOptions): string {
  const values = items.map((item) => toJsonValue(item, options.depth));
  const root: JsonValue = values.length === 1 && !options.asArray ? values[0] : values;
  // JSON.stringify leaves U+0080-U+009F alone, which a terminal would act on.
  return (options.compress ? JSON.stringify(root) : JSON.stringify(root, null, 2)).replace(
    // eslint-disable-next-line no-control-regex
    /[\u007F-\u009F]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

/** What a JSON array or nested object reads as inside a table cell or list: {1, 2, 3}. */
function arrayText(values: PropertyValue[]) {
  return `{${values.map((value) => formatPropertyValue(value)).join(", ")}}`;
}

interface Budget {
  nodes: number;
}

function convert(value: unknown, depth: number, budget: Budget): PropertyValue {
  budget.nodes += 1;
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.replace(CONTROL_CHARACTERS, (char) => (char === "\t" || char === "\n" ? char : ""));
  if (budget.nodes > MAX_JSON_NODES || depth > MAX_PARSE_DEPTH) return "…";

  if (Array.isArray(value)) return arrayText(value.map((entry) => convert(entry, depth + 1, budget)));

  if (typeof value === "object") {
    // A null-prototype record keeps a key called __proto__ an ordinary property.
    const properties: Record<string, PropertyValue> = Object.create(null);
    for (const [key, member] of Object.entries(value as Record<string, unknown>)) {
      if (budget.nodes > MAX_JSON_NODES) break;
      const name = key.replace(CONTROL_CHARACTERS, "").slice(0, MAX_KEY_LENGTH);
      properties[name] = convert(member, depth + 1, budget);
    }
    const text = `@{${Object.entries(properties)
      .map(([key, member]) => `${key}=${formatPropertyValue(member)}`)
      .join("; ")}}`;
    return createObject("System.Management.Automation.PSCustomObject", properties, text);
  }

  return null;
}

export type JsonParseResult = { items: PipelineItem[] } | { error: string };

/** The most JSON text ConvertFrom-Json reads; a page cannot be frozen by one huge document. */
export const MAX_JSON_TEXT = 1_000_000;

/** ConvertFrom-Json: objects become pipeline objects, a top-level array is enumerated, scalars stay scalars. */
export function jsonToItems(text: string): JsonParseResult {
  if (text.length > MAX_JSON_TEXT) return { error: "Conversion from JSON failed with error: the text is too large for this terminal." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "invalid JSON";
    return { error: `Conversion from JSON failed with error: ${reason.replace(CONTROL_CHARACTERS, " ").slice(0, 200)}` };
  }

  const budget: Budget = { nodes: 0 };
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const items: PipelineItem[] = [];
  for (const entry of entries) {
    if (budget.nodes > MAX_JSON_NODES) break;
    const value = convert(entry, 0, budget);
    if (value === null) continue;
    items.push(isShellDate(value) ? formatPropertyValue(value) : value);
  }
  return { items };
}
