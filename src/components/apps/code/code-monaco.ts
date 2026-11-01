import type { BeforeMount } from "@monaco-editor/react";

export const CODE_THEME = "taaniel-dark";

type Monaco = Parameters<BeforeMount>[0];

interface MonarchLanguage {
  keywords: string[];
  control?: string[];
  tokenizer: Record<string, unknown[]>;
}

const CONTROL_WORDS = ["import", "export", "from", "return", "if", "else", "for", "while", "do", "switch", "case", "default", "break", "continue", "throw", "try", "catch", "finally", "await", "as"];

/** The bundled grammar calls every keyword the same thing. These two rules tell flow words and calls apart. */
async function refineGrammar(monaco: Monaco, id: string) {
  const entry = monaco.languages.getLanguages().find((language: { id: string }) => language.id === id) as { loader?: () => Promise<{ language: MonarchLanguage }> } | undefined;
  const language = (await entry?.loader?.())?.language;
  if (!language || language.control) return;

  language.control = CONTROL_WORDS;
  language.tokenizer.common = [
    [/[a-zA-Z_$][\w$]*(?=\s*\()/, { cases: { "@control": "keyword.control", "@keywords": "keyword", "@default": "function" } }],
    [/[a-z_$][\w$]*/, { cases: { "@control": "keyword.control", "@keywords": "keyword", "@default": "variable" } }],
    ...language.tokenizer.common,
  ];
  monaco.languages.setMonarchTokensProvider(id, language as never);
}

let prepared = false;

export const prepareMonaco: BeforeMount = (monaco) => {
  if (prepared) return;
  prepared = true;

  monaco.editor.defineTheme(CODE_THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword.control", foreground: "C586C0" },
      { token: "keyword", foreground: "569CD6" },
      { token: "function", foreground: "DCDCAA" },
      { token: "variable", foreground: "9CDCFE" },
      { token: "type.identifier", foreground: "4EC9B0" },
      { token: "string", foreground: "CE9178" },
      { token: "number", foreground: "B5CEA8" },
      { token: "comment", foreground: "6A9955" },
      { token: "delimiter.bracket", foreground: "FFD700" },
    ],
    colors: {
      "editor.background": "#1b1b1b",
      "editor.lineHighlightBackground": "#262626",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#cccccc",
      "editorGutter.background": "#1b1b1b",
      "minimap.background": "#1b1b1b",
      "scrollbarSlider.background": "#79797933",
      focusBorder: "#00000000",
    },
  });

  // The source imports packages that are not here, so only syntax errors would be true ones.
  const typescript = (monaco.languages as unknown as { typescript?: { typescriptDefaults: Defaults; javascriptDefaults: Defaults; JsxEmit: { Preserve: number } } }).typescript;
  for (const defaults of [typescript?.typescriptDefaults, typescript?.javascriptDefaults]) {
    defaults?.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
    defaults?.setCompilerOptions({ jsx: typescript?.JsxEmit.Preserve, allowJs: true, allowNonTsExtensions: true, target: 99 });
  }

  void refineGrammar(monaco, "typescript").catch(() => {});
  void refineGrammar(monaco, "javascript").catch(() => {});
};

interface Defaults {
  setDiagnosticsOptions(options: Record<string, boolean>): void;
  setCompilerOptions(options: Record<string, unknown>): void;
}
