/*
 * Lightweight PowerShell objects for the terminal's pipeline.
 *
 * Get-ChildItem and Get-Process hand these to Where-Object, ForEach-Object,
 * Select-Object, Sort-Object and the Format-* cmdlets, so `ls | where Length
 * -gt 100 | select Name, Length` behaves the way it does in PowerShell. Every
 * value here is plain data: nothing is ever evaluated as code.
 */

export interface ShellDate {
  kind: "date";
  time: number;
}

/** A property can hold another object ($PSVersionTable.PSVersion.Major), so members chain. */
export type PropertyValue = string | number | boolean | null | ShellDate | ShellObject;

export interface ShellObject {
  kind: "object";
  /** The .NET type name PowerShell would report, e.g. System.IO.FileInfo. */
  typeName: string;
  /** Insertion-ordered; lookups are case-insensitive, as in PowerShell. */
  properties: Record<string, PropertyValue>;
  /** What the object reads as inside a string ("$_"). */
  text: string;
  /**
   * Objects with a dedicated default view: drawn by the shell that made them.
   * "table" always prints as a table; "scalar" prints its last property as a
   * one-column table and is what a variable captures (New-Guid, Resolve-Path).
   */
  view?: "filesystem" | "process" | "table" | "scalar";
  /** filesystem view: the item's virtual path. */
  path?: string;
}

export type PipelineItem = string | number | boolean | ShellObject;

/** Upper bound on items any one cmdlet walks, so a pipeline can't hang the page. */
export const MAX_PIPELINE_ITEMS = 10_000;

const HEADER = "\x1b[32;1m";
const RESET = "\x1b[0m";

export function isShellObject(value: unknown): value is ShellObject {
  return Boolean(value && typeof value === "object" && (value as ShellObject).kind === "object");
}

export function isShellDate(value: unknown): value is ShellDate {
  return Boolean(value && typeof value === "object" && (value as ShellDate).kind === "date");
}

export function createObject(
  typeName: string,
  properties: Record<string, PropertyValue>,
  text: string,
  extra: Pick<ShellObject, "view" | "path"> = {}
): ShellObject {
  return { kind: "object", typeName, properties, text, ...extra };
}

export function formatNumberValue(value: number) {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toPrecision(15)));
}

/** How a property value prints in a table cell or a list. Control characters never reach the terminal. */
export function formatPropertyValue(value: PropertyValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return formatNumberValue(value);
  if (isShellDate(value)) return new Date(value.time).toLocaleString();
  const text = isShellObject(value) ? value.text : value;
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "");
}

/** A value on one table row: line breaks and tabs would tear the row apart. */
function cellText(value: PropertyValue | undefined) {
  return formatPropertyValue(value).replace(/[\t\r\n]+/g, " ");
}

/** What an item reads as when it is used as text: a scalar's value, an object's ToString(). */
export function itemText(item: PipelineItem): string {
  return formatPropertyValue(isShellObject(item) ? item.text : item);
}

/** Case-insensitive property lookup. Strings expose Length, like .NET strings. */
export function getProperty(item: PipelineItem, name: string): PropertyValue | undefined {
  const wanted = name.toLowerCase();
  if (isShellObject(item)) {
    const key = Object.keys(item.properties).find((entry) => entry.toLowerCase() === wanted);
    return key === undefined ? undefined : item.properties[key];
  }
  if (typeof item === "string" && wanted === "length") return item.length;
  return undefined;
}

export function propertyNames(item: PipelineItem): string[] {
  if (isShellObject(item)) return Object.keys(item.properties);
  return typeof item === "string" ? ["Length"] : [];
}

/** The property's own spelling, for headers: "length" asked for, "Length" shown. */
function canonicalName(items: PipelineItem[], name: string) {
  const wanted = name.toLowerCase();
  for (const item of items) {
    const match = propertyNames(item).find((entry) => entry.toLowerCase() === wanted);
    if (match) return match;
  }
  return name;
}

/** Expand "*" and wildcard property names against what the items actually have. */
export function resolvePropertyNames(items: PipelineItem[], requested: string[]): string[] {
  const available: string[] = [];
  items.forEach((item) =>
    propertyNames(item).forEach((name) => {
      if (!available.some((entry) => entry.toLowerCase() === name.toLowerCase())) available.push(name);
    })
  );

  const names: string[] = [];
  for (const request of requested) {
    if (/[*?]/.test(request)) {
      const pattern = new RegExp(`^${request.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
      available.filter((name) => pattern.test(name)).forEach((name) => names.push(name));
    } else {
      names.push(canonicalName(items, request));
    }
  }
  return names.filter((name, index) => names.findIndex((other) => other.toLowerCase() === name.toLowerCase()) === index);
}

/** Split "Name,Length" and "Name, Length" into property names. */
export function splitPropertyList(values: string[]): string[] {
  return values
    .join(",")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Select-Object -Property: new objects with just those properties. */
export function selectProperties(items: PipelineItem[], requested: string[]): ShellObject[] {
  const names = resolvePropertyNames(items, requested);
  return items.map((item) => {
    const properties: Record<string, PropertyValue> = {};
    names.forEach((name) => {
      properties[name] = getProperty(item, name) ?? null;
    });
    const typeName = isShellObject(item) ? `Selected.${item.typeName}` : "Selected.System.String";
    const text = `@{${names.map((name) => `${name}=${formatPropertyValue(properties[name])}`).join("; ")}}`;
    return createObject(typeName, properties, text);
  });
}

/** Ordering for Sort-Object: numbers and dates numerically, text case-insensitively. Nulls first. */
export function compareValues(a: PropertyValue | undefined, b: PropertyValue | undefined): number {
  const rank = (value: PropertyValue | undefined) => (value === null || value === undefined ? 0 : 1);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (a === null || a === undefined || b === null || b === undefined) return 0;
  const numeric = (value: PropertyValue) => (typeof value === "number" ? value : isShellDate(value) ? value.time : typeof value === "boolean" ? Number(value) : null);
  const left = numeric(a);
  const right = numeric(b);
  if (left !== null && right !== null) return left - right;
  return formatPropertyValue(a).localeCompare(formatPropertyValue(b), undefined, { sensitivity: "base" });
}

function isNumeric(value: PropertyValue | undefined) {
  return typeof value === "number";
}

/**
 * Format-Table: a header in PowerShell's table colour, a dashed rule, then
 * rows. Numbers right-align; the last column is never padded.
 */
export function formatTableView(items: PipelineItem[], requested?: string[]): string[] {
  if (!items.length) return [];
  const names = requested?.length ? resolvePropertyNames(items, requested) : resolvePropertyNames(items, ["*"]);
  if (!names.length) return ["", ...items.map(itemText), ""];

  const cells = items.map((item) => names.map((name) => cellText(getProperty(item, name))));
  const numericColumn = names.map((name) => items.every((item) => {
    const value = getProperty(item, name);
    return value === null || value === undefined || isNumeric(value);
  }));
  const widths = names.map((name, column) => Math.min(60, Math.max(name.length, ...cells.map((row) => row[column].length))));

  const cell = (text: string, column: number) => {
    const clipped = text.length > widths[column] ? `${text.slice(0, widths[column] - 1)}…` : text;
    const last = column === names.length - 1;
    if (numericColumn[column]) return clipped.padStart(widths[column]);
    return last ? clipped : clipped.padEnd(widths[column]);
  };

  const header = names.map((name, column) => cell(name, column)).join(" ").trimEnd();
  const rule = names.map((name, column) => cell("-".repeat(name.length), column)).join(" ").trimEnd();
  return [
    "",
    `${HEADER}${header}${RESET}`,
    `${HEADER}${rule}${RESET}`,
    ...cells.map((row) => row.map((text, column) => cell(text, column)).join(" ").trimEnd()),
    "",
  ];
}

/** Format-List: one "Name : value" block per item. */
export function formatListView(items: PipelineItem[], requested?: string[]): string[] {
  if (!items.length) return [];
  const lines: string[] = [""];
  items.forEach((item) => {
    if (!isShellObject(item) && !requested?.length) {
      lines.push(itemText(item));
      return;
    }
    const names = resolvePropertyNames([item], requested?.length ? requested : ["*"]);
    const width = Math.max(0, ...names.map((name) => name.length));
    names.forEach((name) => lines.push(`${name.padEnd(width)} : ${formatPropertyValue(getProperty(item, name))}`));
    lines.push("");
  });
  if (lines.at(-1) !== "") lines.push("");
  return lines;
}

/**
 * PowerShell's default for objects without a dedicated view: a table up to
 * four properties, a list beyond that.
 */
export function formatGenericView(items: PipelineItem[]): string[] {
  const objects = items.filter(isShellObject);
  if (!objects.length) return items.map(itemText);
  return resolvePropertyNames(objects, ["*"]).length <= 4 ? formatTableView(objects) : formatListView(objects);
}
