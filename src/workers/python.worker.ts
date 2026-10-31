/// <reference lib="webworker" />

/*
 * Real CPython (Pyodide) in a worker: a runaway `while True` cannot freeze the
 * page, and Ctrl+C simply terminates this worker. Output is buffered per run.
 */
export type PythonRequest =
  | { id: number; type: "version" }
  | { id: number; type: "run"; code: string; args: string[] }
  | { id: number; type: "push"; line: string }
  | { id: number; type: "reset" };

export type PythonResponse =
  | { id: number; ok: true; output: string; more?: boolean; exit?: boolean; version?: string }
  | { id: number; ok: false; output: string; error: string };

interface PyodideLike {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (text: string) => void }) => void;
  setStderr: (options: { batched: (text: string) => void }) => void;
  globals: { get: (name: string) => (...args: unknown[]) => unknown; set: (name: string, value: unknown) => void };
}

/** A runaway print loop stops being kept long before it can use up the tab's memory. */
const MAX_OUTPUT_CHARS = 512 * 1024;

const SETUP = `
import builtins, code, sys

def _quit(*args):
    raise SystemExit
builtins.exit = builtins.quit = _quit

_repl = code.InteractiveConsole({"__name__": "__main__"})

def _push(line):
    try:
        return "more" if _repl.push(line) else "done"
    except SystemExit:
        return "exit"

def _run(source, argv):
    sys.argv = list(argv)
    exec(compile(source, argv[0], "exec"), {"__name__": "__main__"})
`;

let runtime: Promise<PyodideLike> | null = null;
let output = "";

function keep(text: string) {
  if (output.length < MAX_OUTPUT_CHARS) output += `${text}\n`;
}

function load(indexURL: string) {
  runtime ??= (async () => {
    const { loadPyodide } = (await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)) as {
      loadPyodide: (options: { indexURL: string }) => Promise<PyodideLike>;
    };
    const pyodide = await loadPyodide({ indexURL });
    pyodide.setStdout({ batched: keep });
    pyodide.setStderr({ batched: keep });
    pyodide.runPython(SETUP);
    return pyodide;
  })();
  return runtime;
}

const indexURL = new URLSearchParams(self.location.search).get("index") ?? "";

self.onmessage = async ({ data }: MessageEvent<PythonRequest>) => {
  output = "";
  try {
    const pyodide = await load(indexURL);

    if (data.type === "version") {
      const version = String(pyodide.runPython("import sys; sys.version.split()[0]"));
      self.postMessage({ id: data.id, ok: true, output: "", version } satisfies PythonResponse);
    } else if (data.type === "reset") {
      pyodide.runPython("_repl.resetbuffer()");
      self.postMessage({ id: data.id, ok: true, output: "" } satisfies PythonResponse);
    } else if (data.type === "push") {
      const state = String(pyodide.globals.get("_push")(data.line));
      self.postMessage({ id: data.id, ok: true, output, more: state === "more", exit: state === "exit" } satisfies PythonResponse);
    } else {
      pyodide.globals.set("_source", data.code);
      pyodide.globals.set("_argv", data.args);
      await pyodide.runPythonAsync("_run(_source, _argv.to_py())");
      self.postMessage({ id: data.id, ok: true, output } satisfies PythonResponse);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // sys.exit() in a script is a normal end, not a failure.
    if (/SystemExit/.test(message) && !/Error:/.test(message.split("\n").pop() ?? "")) {
      self.postMessage({ id: data.id, ok: true, output } satisfies PythonResponse);
      return;
    }
    self.postMessage({ id: data.id, ok: false, output, error: message } satisfies PythonResponse);
  }
};

export {};
