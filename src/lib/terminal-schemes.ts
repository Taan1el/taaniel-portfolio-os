import type { ITheme } from "@xterm/xterm";

/**
 * Colour schemes that ship with Windows Terminal (github.com/microsoft/terminal,
 * MIT licence), in xterm.js theme form. "Campbell" is the default.
 */
export interface TerminalScheme {
  id: string;
  name: string;
  /** Light schemes get a dark cursor and a darker selection. */
  light: boolean;
  theme: ITheme;
}

interface Palette {
  background: string;
  foreground: string;
  colors: [
    black: string,
    red: string,
    green: string,
    yellow: string,
    blue: string,
    magenta: string,
    cyan: string,
    white: string,
    brightBlack: string,
    brightRed: string,
    brightGreen: string,
    brightYellow: string,
    brightBlue: string,
    brightMagenta: string,
    brightCyan: string,
    brightWhite: string,
  ];
}

function scheme(id: string, name: string, palette: Palette, light = false): TerminalScheme {
  const [
    black,
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
    brightBlack,
    brightRed,
    brightGreen,
    brightYellow,
    brightBlue,
    brightMagenta,
    brightCyan,
    brightWhite,
  ] = palette.colors;

  return {
    id,
    name,
    light,
    theme: {
      background: palette.background,
      foreground: palette.foreground,
      cursor: light ? palette.foreground : "#FFFFFF",
      cursorAccent: palette.background,
      selectionBackground: light ? "#0000002E" : "#FFFFFF40",
      black,
      red,
      green,
      yellow,
      blue,
      magenta,
      cyan,
      white,
      brightBlack,
      brightRed,
      brightGreen,
      brightYellow,
      brightBlue,
      brightMagenta,
      brightCyan,
      brightWhite,
    },
  };
}

const CAMPBELL_COLORS: Palette["colors"] = [
  "#0C0C0C", "#C50F1F", "#13A10E", "#C19C00", "#0037DA", "#881798", "#3A96DD", "#CCCCCC",
  "#767676", "#E74856", "#16C60C", "#F9F1A5", "#3B78FF", "#B4009E", "#61D6D6", "#F2F2F2",
];

const TANGO_COLORS: Palette["colors"] = [
  "#000000", "#CC0000", "#4E9A06", "#C4A000", "#3465A4", "#75507B", "#06989A", "#D3D7CF",
  "#555753", "#EF2929", "#8AE234", "#FCE94F", "#729FCF", "#AD7FA8", "#34E2E2", "#EEEEEC",
];

const SOLARIZED_COLORS: Palette["colors"] = [
  "#002B36", "#DC322F", "#859900", "#B58900", "#268BD2", "#D33682", "#2AA198", "#EEE8D5",
  "#073642", "#CB4B16", "#586E75", "#657B83", "#839496", "#6C71C4", "#93A1A1", "#FDF6E3",
];

export const terminalSchemes: TerminalScheme[] = [
  scheme("campbell", "Campbell", { background: "#0C0C0C", foreground: "#CCCCCC", colors: CAMPBELL_COLORS }),
  scheme("campbell-powershell", "Campbell Powershell", {
    background: "#012456",
    foreground: "#CCCCCC",
    colors: CAMPBELL_COLORS,
  }),
  scheme("one-half-dark", "One Half Dark", {
    background: "#282C34",
    foreground: "#DCDFE4",
    colors: [
      "#282C34", "#E06C75", "#98C379", "#E5C07B", "#61AFEF", "#C678DD", "#56B6C2", "#DCDFE4",
      "#5A6374", "#E06C75", "#98C379", "#E5C07B", "#61AFEF", "#C678DD", "#56B6C2", "#DCDFE4",
    ],
  }),
  scheme(
    "one-half-light",
    "One Half Light",
    {
      background: "#FAFAFA",
      foreground: "#383A42",
      colors: [
        "#383A42", "#E45649", "#50A14F", "#C18301", "#0184BC", "#A626A4", "#0997B3", "#FAFAFA",
        "#4F525D", "#DF6C75", "#98C379", "#E4C07A", "#61AFEF", "#C577DD", "#56B5C1", "#FFFFFF",
      ],
    },
    true
  ),
  scheme("solarized-dark", "Solarized Dark", { background: "#002B36", foreground: "#839496", colors: SOLARIZED_COLORS }),
  scheme("solarized-light", "Solarized Light", { background: "#FDF6E3", foreground: "#657B83", colors: SOLARIZED_COLORS }, true),
  scheme("tango-dark", "Tango Dark", { background: "#000000", foreground: "#D3D7CF", colors: TANGO_COLORS }),
  scheme("tango-light", "Tango Light", { background: "#FFFFFF", foreground: "#555753", colors: TANGO_COLORS }, true),
  scheme("vintage", "Vintage", {
    background: "#000000",
    foreground: "#C0C0C0",
    colors: [
      "#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#C0C0C0",
      "#808080", "#FF0000", "#00FF00", "#FFFF00", "#0000FF", "#FF00FF", "#00FFFF", "#FFFFFF",
    ],
  }),
];

export const DEFAULT_TERMINAL_SCHEME_ID = "campbell";

export function getTerminalScheme(id: unknown): TerminalScheme {
  return terminalSchemes.find((entry) => entry.id === id) ?? terminalSchemes[0];
}
