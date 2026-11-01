import { COLUMNS, ROWS, SheetError, cellKey, evaluateFormula, parseRef, shiftFormula, type CellRef, type CellValue } from "@/lib/sheet/formula";

export const NUMBER_FORMATS = ["general", "number", "percent", "euro"] as const;
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

export interface CellStyle {
  bold?: boolean;
  align?: "left" | "center" | "right";
  format?: NumberFormat;
}

export interface SheetData {
  /** What was typed, by key: "A1" to "12" or "=SUM(A1:A3)". */
  cells: Record<string, string>;
  styles: Record<string, CellStyle>;
}

export interface Selection {
  anchor: CellRef;
  focus: CellRef;
}

const MAX_CELL = 8000;

export const emptySheet = (): SheetData => ({ cells: {}, styles: {} });

/** What a typed value means, before any formula runs. */
export function literalValue(raw: string): CellValue {
  const text = raw.trim();
  if (text === "") return null;
  const upper = text.toUpperCase();
  if (upper === "TRUE") return true;
  if (upper === "FALSE") return false;
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text)) return Number(text);
  const percent = /^([+-]?(\d+\.?\d*|\.\d+))%$/.exec(text);
  return percent ? Number(percent[1]) / 100 : raw;
}

/**
 * Works out every cell. Each is computed once and remembered, in whatever order formulas ask
 * for them. A cell met again while it is still being computed is part of a loop.
 */
export function computeSheet(cells: Record<string, string>) {
  const values = new Map<string, CellValue>();
  const inProgress = new Set<string>();

  const valueOf = (key: string): CellValue => {
    const known = values.get(key);
    if (known !== undefined) return known;
    if (inProgress.has(key)) return new SheetError("#CIRC!");

    const raw = cells[key];
    if (raw === undefined) return null;

    let value: CellValue;
    if (raw.startsWith("=") && raw.length > 1) {
      inProgress.add(key);
      value = evaluateFormula(raw.slice(1), (ref) => valueOf(cellKey(ref.column, ref.row)));
      inProgress.delete(key);
    } else {
      value = literalValue(raw);
    }
    values.set(key, value);
    return value;
  };

  for (const key of Object.keys(cells)) valueOf(key);
  return values;
}

/** Hides binary rounding noise, so 0.1 + 0.2 shows 0.3. */
const tidy = (value: number) => Number(value.toPrecision(12));

export function formatValue(value: CellValue | undefined, format: NumberFormat = "general") {
  if (value === null || value === undefined) return "";
  if (value instanceof SheetError) return value.code;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") return value;
  if (format === "number") return value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (format === "percent") return `${tidy(value * 100)}%`;
  if (format === "euro") return `€${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return String(tidy(value));
}

export function selectionBounds({ anchor, focus }: Selection) {
  return {
    left: Math.min(anchor.column, focus.column),
    right: Math.max(anchor.column, focus.column),
    top: Math.min(anchor.row, focus.row),
    bottom: Math.max(anchor.row, focus.row),
  };
}

export function selectionKeys(selection: Selection) {
  const { left, right, top, bottom } = selectionBounds(selection);
  const keys: string[] = [];
  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) keys.push(cellKey(column, row));
  }
  return keys;
}

export const selectionName = (selection: Selection) => {
  const { left, right, top, bottom } = selectionBounds(selection);
  const start = cellKey(left, top);
  return left === right && top === bottom ? start : `${start}:${cellKey(right, bottom)}`;
};

/** The numbers shown in the status bar for what is selected. */
export function summarize(values: Map<string, CellValue>, selection: Selection) {
  const numbers = selectionKeys(selection)
    .map((key) => values.get(key))
    .filter((value): value is number => typeof value === "number");
  const sum = numbers.reduce((total, value) => total + value, 0);
  return { count: numbers.length, sum: tidy(sum), average: numbers.length ? tidy(sum / numbers.length) : 0 };
}

/** Rows of raw cells, as they sit in the selection. */
export function copyCells(data: SheetData, selection: Selection) {
  const { left, right, top, bottom } = selectionBounds(selection);
  const rows: string[][] = [];
  for (let row = top; row <= bottom; row += 1) {
    const cells: string[] = [];
    for (let column = left; column <= right; column += 1) cells.push(data.cells[cellKey(column, row)] ?? "");
    rows.push(cells);
  }
  return { rows, column: left, row: top };
}

/** Writes rows at a position. Copied formulas shift by how far they moved; `from` is null for plain text. */
export function pasteCells(data: SheetData, rows: string[][], target: CellRef, from: CellRef | null): SheetData {
  const cells = { ...data.cells };

  rows.forEach((line, rowOffset) => {
    line.forEach((raw, columnOffset) => {
      const column = target.column + columnOffset;
      const row = target.row + rowOffset;
      if (column >= COLUMNS || row >= ROWS) return;
      const key = cellKey(column, row);
      const value = from && raw.startsWith("=") ? shiftFormula(raw, target.column - from.column, target.row - from.row) : raw;
      if (value === "") delete cells[key];
      else cells[key] = value.slice(0, MAX_CELL);
    });
  });

  return { ...data, cells };
}

/** Copies the top row of the selection down through it, shifting formulas. */
export function fillDown(data: SheetData, selection: Selection): SheetData {
  const { left, right, top, bottom } = selectionBounds(selection);
  let next = data;
  const source = { anchor: { column: left, row: top }, focus: { column: right, row: top } };
  const rows = copyCells(data, source).rows;
  for (let row = top + 1; row <= bottom; row += 1) next = pasteCells(next, rows, { column: left, row }, source.anchor);
  return next;
}

export function clearCells(data: SheetData, selection: Selection): SheetData {
  const cells = { ...data.cells };
  for (const key of selectionKeys(selection)) delete cells[key];
  return { ...data, cells };
}

/** Rectangle of values for the clipboard, tab separated. Formulas travel as their results. */
export function toTsv(values: Map<string, CellValue>, data: SheetData, selection: Selection) {
  const { left, right, top, bottom } = selectionBounds(selection);
  const lines: string[] = [];
  for (let row = top; row <= bottom; row += 1) {
    const cells: string[] = [];
    for (let column = left; column <= right; column += 1) {
      const key = cellKey(column, row);
      cells.push(formatValue(values.get(key), data.styles[key]?.format));
    }
    lines.push(cells.join("\t"));
  }
  return lines.join("\n");
}

export const parseTsv = (text: string) => text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));

/** RFC 4180: quotes around fields, doubled quotes inside them. */
export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Text from outside must not start running as a formula here or in the next program, so a cell
 * from a CSV is kept as plain text if it starts like one.
 */
const asPlainText = (value: string) => (/^[=+\-@\t\r]/.test(value) && Number.isNaN(Number(value)) ? `'${value}` : value);

export function sheetFromCsv(text: string): SheetData {
  const cells: Record<string, string> = {};
  parseCsv(text).slice(0, ROWS).forEach((line, row) => {
    line.slice(0, COLUMNS).forEach((value, column) => {
      if (value !== "") cells[cellKey(column, row)] = asPlainText(value).slice(0, MAX_CELL);
    });
  });
  return { cells, styles: {} };
}

export function toCsv(values: Map<string, CellValue>, data: SheetData) {
  let lastRow = -1;
  let lastColumn = -1;
  for (const key of Object.keys(data.cells)) {
    const ref = parseRef(key);
    if (ref) {
      lastRow = Math.max(lastRow, ref.row);
      lastColumn = Math.max(lastColumn, ref.column);
    }
  }

  const quote = (value: string) => {
    const safe = asPlainText(value);
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines: string[] = [];
  for (let row = 0; row <= lastRow; row += 1) {
    const cells: string[] = [];
    for (let column = 0; column <= lastColumn; column += 1) cells.push(quote(formatValue(values.get(cellKey(column, row)))));
    lines.push(cells.join(","));
  }
  return lines.join("\r\n");
}

export const serializeSheet = (data: SheetData) => JSON.stringify({ version: 1, ...data });

/** A sheet file is untrusted: only valid keys, text and known styles get through. */
export function parseSheet(text: string | undefined): SheetData {
  const sheet = emptySheet();

  try {
    const parsed = JSON.parse(text ?? "") as { cells?: unknown; styles?: unknown };
    if (parsed.cells && typeof parsed.cells === "object") {
      for (const [key, value] of Object.entries(parsed.cells)) {
        const ref = parseRef(key);
        if (ref && typeof value === "string" && value !== "") sheet.cells[cellKey(ref.column, ref.row)] = value.slice(0, MAX_CELL);
      }
    }
    if (parsed.styles && typeof parsed.styles === "object") {
      for (const [key, value] of Object.entries(parsed.styles)) {
        const ref = parseRef(key);
        const style = value as CellStyle | null;
        if (!ref || !style || typeof style !== "object") continue;
        const clean: CellStyle = {};
        if (style.bold === true) clean.bold = true;
        if (style.align === "left" || style.align === "center" || style.align === "right") clean.align = style.align;
        if (NUMBER_FORMATS.includes(style.format as NumberFormat)) clean.format = style.format;
        if (Object.keys(clean).length) sheet.styles[cellKey(ref.column, ref.row)] = clean;
      }
    }
  } catch {
    return emptySheet();
  }

  return sheet;
}
