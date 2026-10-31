/*
 * The Command Prompt's PROMPT command: a template of text and $ codes that is
 * expanded into the prompt before each line. Everything that comes out of it is
 * cleaned, because the template is typed by the visitor (or set by a script
 * they pasted) and the prompt is printed over and over: no control characters
 * but colour codes ($E[32m), a length cap, and a cap on how many lines it takes.
 */

export const DEFAULT_PROMPT_TEMPLATE = "$P$G";

/** The longest template PROMPT keeps, and the longest prompt it expands to. */
export const MAX_PROMPT_TEMPLATE_LENGTH = 256;
export const MAX_PROMPT_LENGTH = 300;
/** Lines a prompt may take: the lines before the one the input goes on, and that one. */
export const MAX_PROMPT_LINES = 4;

export interface PromptContext {
  /** The current folder as Windows prints it, for $P. */
  path: string;
  /** What $D and $T print. */
  date: string;
  time: string;
  /** What $V prints: the version line. */
  version: string;
}

/** The template as it is kept: typed text with control characters taken out and a length cap. */
export function sanitizePromptTemplate(template: string): string {
  // eslint-disable-next-line no-control-regex
  return template.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").slice(0, MAX_PROMPT_TEMPLATE_LENGTH);
}

// eslint-disable-next-line no-control-regex
const ESCAPE_NOT_COLOUR = /\u001B(?!\[[0-9;]*m)/g;
// eslint-disable-next-line no-control-regex
const CONTROLS_EXCEPT_ESCAPE_AND_NEWLINE = /[\u0000-\u0009\u000B-\u001A\u001C-\u001F\u007F-\u009F]/g;

const SIMPLE_CODES: Record<string, string> = {
  a: "&",
  b: "|",
  c: "(",
  f: ")",
  g: ">",
  l: "<",
  q: "=",
  s: " ",
  _: "\n",
  $: "$",
  n: "C",
};

/**
 * Expand a PROMPT template: $P the folder, $G a >, $_ a new line, $E the escape character
 * (so $E[32m turns the text green), and the rest of cmd's codes. A code that is not known,
 * or that this prompt cannot show ($+, $M), is dropped, as cmd drops it.
 */
export function expandPromptTemplate(template: string, context: PromptContext): string {
  const text = sanitizePromptTemplate(template);
  let out = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char !== "$") {
      out += char;
      continue;
    }

    index += 1;
    const code = (text[index] ?? "").toLowerCase();
    if (code === "p") out += context.path;
    else if (code === "d") out += context.date;
    else if (code === "t") out += context.time;
    else if (code === "v") out += context.version;
    else if (code === "e") out += "\u001B";
    else if (code === "h") out = out.slice(0, -1);
    else if (Object.prototype.hasOwnProperty.call(SIMPLE_CODES, code)) out += SIMPLE_CODES[code];
  }

  return cleanPrompt(out);
}

/**
 * Only colour codes may keep their escape character, the length is capped, and so is the number of lines.
 * Cutting a prompt must not leave a colour on: a cut inside a code drops that code.
 */
function cleanPrompt(prompt: string): string {
  const safe = prompt.replace(ESCAPE_NOT_COLOUR, "").replace(CONTROLS_EXCEPT_ESCAPE_AND_NEWLINE, "");
  // A colour code cut in half is not a code: drop the half.
  // eslint-disable-next-line no-control-regex
  let capped = safe.slice(0, MAX_PROMPT_LENGTH).replace(/\u001B\[[0-9;]*$/, "");
  const lines = capped.split("\n");
  if (lines.length > MAX_PROMPT_LINES) {
    capped = [...lines.slice(0, MAX_PROMPT_LINES - 1), lines.slice(MAX_PROMPT_LINES - 1).join(" ")].join("\n");
  }
  // Colour left on at the end would colour what is typed: reset it, unless the last code already did.
  // eslint-disable-next-line no-control-regex
  const lastColour = [...capped.matchAll(/\u001B\[[0-9;]*m/g)].at(-1)?.[0];
  // eslint-disable-next-line no-control-regex
  return lastColour && !/^\u001B\[0*m$/.test(lastColour) ? `${capped}\u001B[0m` : capped;
}

export interface PromptParts {
  /** Every line but the last, with its line ends (as written once, when a new prompt starts). */
  head: string;
  /** The line the input follows: the only part that is repainted as the input changes. */
  last: string;
}

/** Split a prompt at its last line. A prompt with no line break is all `last`. */
export function splitPrompt(prompt: string): PromptParts {
  const cut = prompt.lastIndexOf("\n");
  return { head: cut >= 0 ? prompt.slice(0, cut + 1) : "", last: prompt.slice(cut + 1) };
}
