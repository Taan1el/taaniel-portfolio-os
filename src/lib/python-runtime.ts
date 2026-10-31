import type { PythonRequest, PythonResponse } from "@/workers/python.worker";

export class PythonInterrupted extends Error {}

export interface PythonResult {
  output: string;
  error?: string;
  /** The REPL is waiting for the rest of a block. */
  more?: boolean;
  /** exit() was called. */
  exit?: boolean;
  version?: string;
}

type Sendable = PythonRequest extends infer Request ? (Request extends unknown ? Omit<Request, "id"> : never) : never;

function createWorker() {
  // The worker's Pyodide files live with the site, so nothing is fetched from elsewhere.
  const index = new URL(`${import.meta.env.BASE_URL}assets/pyodide/`, globalThis.location.href).href;
  const url = new URL("../workers/python.worker.ts", import.meta.url);
  url.searchParams.set("index", index);
  return new Worker(url, { type: "module" });
}

let worker: Worker | null = null;
let nextId = 1;

/**
 * The one Python of this page. Ctrl+C can only stop running Python by ending
 * its worker, so an interrupt also resets the REPL's variables.
 */
export function sendToPython(request: Sendable, signal?: AbortSignal): Promise<PythonResult> {
  if (signal?.aborted) return Promise.reject(new PythonInterrupted());
  worker ??= createWorker();
  const running = worker;
  const id = nextId++;

  return new Promise<PythonResult>((resolve, reject) => {
    const finish = () => {
      running.removeEventListener("message", onMessage);
      running.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const onMessage = ({ data }: MessageEvent<PythonResponse>) => {
      if (data.id !== id) return;
      finish();
      resolve(data.ok ? data : { output: data.output, error: data.error });
    };
    const onError = (event: ErrorEvent) => {
      finish();
      worker = null;
      running.terminate();
      reject(new Error(event.message || "Python could not start."));
    };
    const onAbort = () => {
      finish();
      worker = null;
      running.terminate();
      reject(new PythonInterrupted());
    };

    running.addEventListener("message", onMessage);
    running.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort, { once: true });
    running.postMessage({ ...request, id });
  });
}
