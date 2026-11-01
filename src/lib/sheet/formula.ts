/**
 * A small formula language: a tokenizer, a Pratt-style parser and an evaluator over the syntax tree.
 * Nothing here calls eval or Function, so a formula can only do what this file lets it do.
 */

export const COLUMNS = 26;
export const ROWS = 100;
const MAX_FORMULA = 2000;
const MAX_NESTING = 64;

export class SheetError {
  constructor(readonly code: "#DIV/0!" | "#VALUE!" | "#REF!" | "#NAME?" | "#CIRC!" | "#ERROR!" | "#NUM!") {}
}

export type CellValue = number | string | boolean | null | SheetError;

export interface CellRef {
  column: number;
  row: number;
}

type Node =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "ref"; ref: CellRef }
  | { type: "range"; from: CellRef; to: CellRef }
  | { type: "unary"; operator: "-" | "+"; operand: Node }
  | { type: "percent"; operand: Node }
  | { type: "binary"; operator: string; left: Node; right: Node }
  | { type: "call"; name: string; args: Node[] };

type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "word"; value: string }
  | { kind: "ref"; value: string }
  | { kind: "symbol"; value: string };

export function columnName(column: number) {
  return String.fromCharCode(65 + column);
}

export const cellKey = (column: number, row: number) => `${columnName(column)}${row + 1}`;

/** "B3" or "$B$3" to a position, or null if it is off the sheet. */
export function parseRef(text: string): CellRef | null {
  const match = /^\$?([A-Z])\$?(\d{1,3})$/i.exec(text);
  if (!match) return null;
  const column = match[1].toUpperCase().charCodeAt(0) - 65;
  const row = Number(match[2]) - 1;
  return row >= 0 && row < ROWS ? { column, row } : null;
}

const REF = /^\$?[A-Za-z]\$?\d{1,3}(?![\w.])/;
const WORD = /^[A-Za-z_][A-Za-z0-9_.]*/;
const NUMBER = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/;
const SYMBOLS = ["<=", ">=", "<>", "+", "-", "*", "/", "^", "%", "&", "=", "<", ">", "(", ")", ",", ":"];

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let rest = source;

  while (rest.length) {
    const space = /^\s+/.exec(rest);
    if (space) {
      rest = rest.slice(space[0].length);
      continue;
    }

    if (rest[0] === '"') {
      let index = 1;
      let value = "";
      for (;;) {
        if (index >= rest.length) throw new SheetError("#ERROR!");
        if (rest[index] === '"') {
          if (rest[index + 1] !== '"') break;
          value += '"';
          index += 2;
        } else {
          value += rest[index];
          index += 1;
        }
      }
      tokens.push({ kind: "string", value });
      rest = rest.slice(index + 1);
      continue;
    }

    const ref = REF.exec(rest);
    if (ref) {
      tokens.push({ kind: "ref", value: ref[0] });
      rest = rest.slice(ref[0].length);
      continue;
    }

    const number = NUMBER.exec(rest);
    if (number) {
      tokens.push({ kind: "number", value: Number(number[0]) });
      rest = rest.slice(number[0].length);
      continue;
    }

    const word = WORD.exec(rest);
    if (word) {
      tokens.push({ kind: "word", value: word[0].toUpperCase() });
      rest = rest.slice(word[0].length);
      continue;
    }

    const symbol = SYMBOLS.find((entry) => rest.startsWith(entry));
    if (!symbol) throw new SheetError("#ERROR!");
    tokens.push({ kind: "symbol", value: symbol });
    rest = rest.slice(symbol.length);
  }

  return tokens;
}

/** Binding powers, weakest first. As in spreadsheets, unary minus binds tighter than ^, so -2^2 is 4. */
const BINARY_POWER: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };

class Parser {
  private index = 0;
  private depth = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek() {
    return this.tokens[this.index];
  }

  private isSymbol(value: string) {
    const token = this.peek();
    return token?.kind === "symbol" && token.value === value;
  }

  private expect(value: string) {
    if (!this.isSymbol(value)) throw new SheetError("#ERROR!");
    this.index += 1;
  }

  parse(): Node {
    const node = this.expression(0);
    if (this.index !== this.tokens.length) throw new SheetError("#ERROR!");
    return node;
  }

  private expression(minimum: number): Node {
    this.depth += 1;
    if (this.depth > MAX_NESTING) throw new SheetError("#ERROR!");
    let left = this.unary();

    for (;;) {
      const token = this.peek();
      const power = token?.kind === "symbol" ? BINARY_POWER[token.value] : undefined;
      if (power === undefined || power <= minimum) break;
      this.index += 1;
      left = { type: "binary", operator: (token as { value: string }).value, left, right: this.expression(power) };
    }

    this.depth -= 1;
    return left;
  }

  private unary(): Node {
    if (this.isSymbol("-") || this.isSymbol("+")) {
      const operator = (this.peek() as { value: "-" | "+" }).value;
      this.index += 1;
      return { type: "unary", operator, operand: this.unary() };
    }
    return this.postfix();
  }

  private postfix(): Node {
    let node = this.primary();
    while (this.isSymbol("%")) {
      this.index += 1;
      node = { type: "percent", operand: node };
    }
    return node;
  }

  private primary(): Node {
    const token = this.peek();
    if (!token) throw new SheetError("#ERROR!");
    this.index += 1;

    if (token.kind === "number") return { type: "number", value: token.value };
    if (token.kind === "string") return { type: "string", value: token.value };

    if (token.kind === "ref") {
      const from = parseRef(token.value);
      if (!from) throw new SheetError("#REF!");
      if (!this.isSymbol(":")) return { type: "ref", ref: from };
      this.index += 1;
      const end = this.peek();
      const to = end?.kind === "ref" ? parseRef(end.value) : null;
      if (!to) throw new SheetError("#ERROR!");
      this.index += 1;
      return { type: "range", from, to };
    }

    if (token.kind === "word") {
      if (this.isSymbol("(")) return this.call(token.value);
      if (token.value === "TRUE" || token.value === "FALSE") return { type: "boolean", value: token.value === "TRUE" };
      throw new SheetError("#NAME?");
    }

    if (token.value === "(") {
      const node = this.expression(0);
      this.expect(")");
      return node;
    }

    throw new SheetError("#ERROR!");
  }

  private call(name: string): Node {
    this.expect("(");
    const args: Node[] = [];
    if (this.isSymbol(")")) {
      this.index += 1;
      return { type: "call", name, args };
    }
    for (;;) {
      args.push(this.expression(0));
      if (this.isSymbol(",")) {
        this.index += 1;
        continue;
      }
      this.expect(")");
      return { type: "call", name, args };
    }
  }
}

export function parseFormula(source: string): Node {
  if (source.length > MAX_FORMULA) throw new SheetError("#ERROR!");
  return new Parser(tokenize(source)).parse();
}

const isError = (value: unknown): value is SheetError => value instanceof SheetError;

function toNumber(value: CellValue): number | SheetError {
  if (isError(value)) return value;
  if (value === null || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? new SheetError("#VALUE!") : parsed;
}

function toText(value: CellValue): string | SheetError {
  if (isError(value)) return value;
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function toBoolean(value: CellValue): boolean | SheetError {
  if (isError(value)) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (value === null) return false;
  const text = value.toUpperCase();
  if (text === "TRUE") return true;
  if (text === "FALSE") return false;
  return new SheetError("#VALUE!");
}

/** Compares as a spreadsheet does: numbers before text before booleans, ignoring case. */
function compare(left: CellValue, right: CellValue) {
  const rank = (value: CellValue) => (typeof value === "number" ? 0 : typeof value === "string" ? 1 : 2);
  const a = left === null ? (typeof right === "string" ? "" : typeof right === "boolean" ? false : 0) : left;
  const b = right === null ? (typeof left === "string" ? "" : typeof left === "boolean" ? false : 0) : right;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === "string") return a.toLowerCase().localeCompare(String(b).toLowerCase());
  return Number(a) - Number(b);
}

const finite = (value: number) => (Number.isFinite(value) ? value : new SheetError("#NUM!"));

type Values = (CellValue | CellValue[])[];

/** Flattens arguments. In a range, blanks and text are skipped by the numeric functions. */
function numbersIn(args: Values) {
  const numbers: number[] = [];
  for (const arg of args) {
    if (Array.isArray(arg)) {
      for (const value of arg) {
        if (isError(value)) return value;
        if (typeof value === "number") numbers.push(value);
      }
    } else {
      const number = toNumber(arg);
      if (isError(number)) return number;
      numbers.push(number);
    }
  }
  return numbers;
}

function criterionTest(criterion: CellValue) {
  const text = String(criterion ?? "");
  const match = /^(<=|>=|<>|<|>|=)(.*)$/.exec(text);
  const operator = match ? match[1] : "=";
  const raw = match ? match[2] : text;
  const number = raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : null;
  const target: CellValue = number ?? raw;

  return (value: CellValue) => {
    if (isError(value)) return false;
    if (number !== null && typeof value !== "number") return operator === "<>";
    const order = compare(value, target);
    return { "=": order === 0, "<>": order !== 0, "<": order < 0, ">": order > 0, "<=": order <= 0, ">=": order >= 0 }[operator] as boolean;
  };
}

function aggregate(args: Values, reduce: (numbers: number[]) => CellValue) {
  const numbers = numbersIn(args);
  return isError(numbers) ? numbers : reduce(numbers);
}

function single(args: Values, count: number) {
  if (args.length !== count) return new SheetError("#VALUE!");
  return args.some(Array.isArray) ? new SheetError("#VALUE!") : null;
}

function math(args: Values, operation: (value: number) => number) {
  const bad = single(args, 1);
  if (bad) return bad;
  const value = toNumber(args[0] as CellValue);
  return isError(value) ? value : finite(operation(value));
}

function text(args: Values, operation: (value: string) => CellValue) {
  const bad = single(args, 1);
  if (bad) return bad;
  const value = toText(args[0] as CellValue);
  return isError(value) ? value : operation(value);
}

function sliced(args: Values, operation: (value: string, count: number) => string) {
  if (args.length < 1 || args.length > 2) return new SheetError("#VALUE!");
  const value = toText(args[0] as CellValue);
  const count = args.length === 2 ? toNumber(args[1] as CellValue) : 1;
  if (isError(value)) return value;
  if (isError(count)) return count;
  return count < 0 ? new SheetError("#VALUE!") : operation(value, Math.floor(count));
}

/** Functions that take evaluated arguments. IF is not here, because it must leave one branch unevaluated. */
const FUNCTIONS = new Map<string, (args: Values) => CellValue>([
  ["SUM", (args) => aggregate(args, (numbers) => numbers.reduce((sum, value) => sum + value, 0))],
  ["AVERAGE", (args) => aggregate(args, (numbers) => (numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : new SheetError("#DIV/0!")))],
  ["MIN", (args) => aggregate(args, (numbers) => (numbers.length ? Math.min(...numbers) : 0))],
  ["MAX", (args) => aggregate(args, (numbers) => (numbers.length ? Math.max(...numbers) : 0))],
  ["COUNT", (args) => args.flat().filter((value) => typeof value === "number").length],
  ["COUNTA", (args) => args.flat().filter((value) => value !== null && value !== "").length],
  ["ABS", (args) => math(args, Math.abs)],
  ["INT", (args) => math(args, Math.floor)],
  ["SQRT", (args) => math(args, Math.sqrt)],
  ["ROUND", (args) => {
    if (args.length < 1 || args.length > 2) return new SheetError("#VALUE!");
    const value = toNumber(args[0] as CellValue);
    const digits = args.length === 2 ? toNumber(args[1] as CellValue) : 0;
    if (isError(value)) return value;
    if (isError(digits)) return digits;
    const scale = 10 ** Math.trunc(digits);
    return Math.round((value + Number.EPSILON * Math.sign(value)) * scale) / scale;
  }],
  ["POWER", (args) => {
    if (args.length !== 2) return new SheetError("#VALUE!");
    const base = toNumber(args[0] as CellValue);
    const power = toNumber(args[1] as CellValue);
    if (isError(base)) return base;
    return isError(power) ? power : finite(base ** power);
  }],
  ["MOD", (args) => {
    if (args.length !== 2) return new SheetError("#VALUE!");
    const value = toNumber(args[0] as CellValue);
    const divisor = toNumber(args[1] as CellValue);
    if (isError(value)) return value;
    if (isError(divisor)) return divisor;
    return divisor === 0 ? new SheetError("#DIV/0!") : value - divisor * Math.floor(value / divisor);
  }],
  ["PI", () => Math.PI],
  ["AND", (args) => {
    let all = true;
    for (const value of args.flat()) {
      const flag = toBoolean(value);
      if (isError(flag)) return flag;
      all &&= flag;
    }
    return all;
  }],
  ["OR", (args) => {
    let any = false;
    for (const value of args.flat()) {
      const flag = toBoolean(value);
      if (isError(flag)) return flag;
      any ||= flag;
    }
    return any;
  }],
  ["NOT", (args) => {
    const bad = single(args, 1);
    if (bad) return bad;
    const flag = toBoolean(args[0] as CellValue);
    return isError(flag) ? flag : !flag;
  }],
  ["LEN", (args) => text(args, (value) => value.length)],
  ["UPPER", (args) => text(args, (value) => value.toUpperCase())],
  ["LOWER", (args) => text(args, (value) => value.toLowerCase())],
  ["TRIM", (args) => text(args, (value) => value.trim().replace(/\s+/g, " "))],
  ["LEFT", (args) => sliced(args, (value, count) => value.slice(0, count))],
  ["RIGHT", (args) => sliced(args, (value, count) => (count ? value.slice(-count) : ""))],
  ["MID", (args) => {
    if (args.length !== 3) return new SheetError("#VALUE!");
    const value = toText(args[0] as CellValue);
    const start = toNumber(args[1] as CellValue);
    const count = toNumber(args[2] as CellValue);
    if (isError(value)) return value;
    if (isError(start)) return start;
    if (isError(count)) return count;
    return start < 1 || count < 0 ? new SheetError("#VALUE!") : value.slice(start - 1, start - 1 + count);
  }],
  ["CONCAT", (args) => {
    let joined = "";
    for (const value of args.flat()) {
      const part = toText(value);
      if (isError(part)) return part;
      joined += part;
    }
    return joined;
  }],
  ["COUNTIF", (args) => {
    if (args.length !== 2 || !Array.isArray(args[0])) return new SheetError("#VALUE!");
    return args[0].filter(criterionTest(args[1] as CellValue)).length;
  }],
  ["SUMIF", (args) => {
    if (args.length < 2 || args.length > 3 || !Array.isArray(args[0])) return new SheetError("#VALUE!");
    const test = criterionTest(args[1] as CellValue);
    const totals = (args.length === 3 ? args[2] : args[0]) as CellValue[];
    if (!Array.isArray(totals)) return new SheetError("#VALUE!");
    return args[0].reduce<number>((sum, value, index) => (test(value) && typeof totals[index] === "number" ? sum + (totals[index] as number) : sum), 0);
  }],
]);

export const FUNCTION_NAMES = [...FUNCTIONS.keys(), "IF", "IFERROR"].sort();

function binary(operator: string, left: CellValue, right: CellValue): CellValue {
  if (isError(left)) return left;
  if (isError(right)) return right;

  switch (operator) {
    case "&": {
      return `${toText(left)}${toText(right)}`;
    }
    case "=":
      return compare(left, right) === 0;
    case "<>":
      return compare(left, right) !== 0;
    case "<":
      return compare(left, right) < 0;
    case ">":
      return compare(left, right) > 0;
    case "<=":
      return compare(left, right) <= 0;
    case ">=":
      return compare(left, right) >= 0;
  }

  const a = toNumber(left);
  const b = toNumber(right);
  if (isError(a)) return a;
  if (isError(b)) return b;

  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? new SheetError("#DIV/0!") : a / b;
    default:
      return finite(a ** b);
  }
}

export function refsInRange(from: CellRef, to: CellRef) {
  const refs: CellRef[] = [];
  for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row += 1) {
    for (let column = Math.min(from.column, to.column); column <= Math.max(from.column, to.column); column += 1) {
      refs.push({ column, row });
    }
  }
  return refs;
}

function evaluateNode(node: Node, read: (ref: CellRef) => CellValue): CellValue | CellValue[] {
  const value = (child: Node): CellValue => {
    const result = evaluateNode(child, read);
    // A range used as one value is a mistake, except in the functions that ask for one.
    return Array.isArray(result) ? new SheetError("#VALUE!") : result;
  };

  switch (node.type) {
    case "number":
    case "string":
    case "boolean":
      return node.value;
    case "ref":
      return read(node.ref);
    case "range":
      return refsInRange(node.from, node.to).map(read);
    case "unary": {
      const operand = toNumber(value(node.operand));
      if (isError(operand)) return operand;
      return node.operator === "-" ? -operand : operand;
    }
    case "percent": {
      const operand = toNumber(value(node.operand));
      return isError(operand) ? operand : operand / 100;
    }
    case "binary":
      return binary(node.operator, value(node.left), value(node.right));
    case "call": {
      if (node.name === "IF") {
        if (node.args.length < 2 || node.args.length > 3) return new SheetError("#VALUE!");
        const test = toBoolean(value(node.args[0]));
        if (isError(test)) return test;
        if (test) return value(node.args[1]);
        return node.args[2] ? value(node.args[2]) : false;
      }
      if (node.name === "IFERROR") {
        if (node.args.length !== 2) return new SheetError("#VALUE!");
        const attempt = value(node.args[0]);
        return isError(attempt) ? value(node.args[1]) : attempt;
      }
      const run = FUNCTIONS.get(node.name);
      return run ? run(node.args.map((arg) => evaluateNode(arg, read))) : new SheetError("#NAME?");
    }
  }
}

export function evaluateFormula(source: string, read: (ref: CellRef) => CellValue): CellValue {
  try {
    const result = evaluateNode(parseFormula(source), read);
    return Array.isArray(result) ? new SheetError("#VALUE!") : result;
  } catch (error) {
    if (error instanceof SheetError) return error;
    throw error;
  }
}

/** Every cell a formula reads, for callers that want to know what it depends on. */
export function formulaRefs(source: string): CellRef[] {
  const refs: CellRef[] = [];
  const walk = (node: Node) => {
    if (node.type === "ref") refs.push(node.ref);
    else if (node.type === "range") refs.push(...refsInRange(node.from, node.to));
    else if (node.type === "unary" || node.type === "percent") walk(node.operand);
    else if (node.type === "binary") {
      walk(node.left);
      walk(node.right);
    } else if (node.type === "call") node.args.forEach(walk);
  };

  try {
    walk(parseFormula(source));
  } catch {
    return [];
  }
  return refs;
}

/** Moves relative references in a copied formula. A reference pushed off the sheet becomes #REF!. */
export function shiftFormula(source: string, columns: number, rows: number) {
  let result = "";
  let index = 0;

  while (index < source.length) {
    if (source[index] === '"') {
      let end = index + 1;
      while (end < source.length && (source[end] !== '"' || source[end + 1] === '"')) end += source[end] === '"' ? 2 : 1;
      result += source.slice(index, end + 1);
      index = end + 1;
      continue;
    }

    const before = source[index - 1] ?? "";
    const match = /[\w.]/.test(before) ? null : /^(\$?)([A-Za-z])(\$?)(\d{1,3})(?![\w.(])/.exec(source.slice(index));
    if (match) {
      const [whole, lockColumn, letter, lockRow, digits] = match;
      const column = letter.toUpperCase().charCodeAt(0) - 65 + (lockColumn ? 0 : columns);
      const row = Number(digits) + (lockRow ? 0 : rows);
      result += column < 0 || column >= COLUMNS || row < 1 || row > ROWS ? "#REF!" : `${lockColumn}${columnName(column)}${lockRow}${row}`;
      index += whole.length;
      continue;
    }

    result += source[index];
    index += 1;
  }

  return result;
}
