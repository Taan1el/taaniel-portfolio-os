/// <reference lib="webworker" />

import { env, pipeline } from "@huggingface/transformers";
import type { ShellSearchAiCandidate, ShellSearchAiRanking } from "@/lib/shell-search";

type RerankMessage = {
  type: "rerank";
  requestId: number;
  query: string;
  documents: ShellSearchAiCandidate[];
};

type WorkerStatus = "warming" | "ready";

type WorkerResponse =
  | { type: "status"; status: WorkerStatus }
  | { type: "result"; requestId: number; rankings: ShellSearchAiRanking[] }
  | { type: "error"; requestId: number; message: string };

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

let extractorPromise: Promise<any> | null = null;
let readyPosted = false;

function postResponse(message: WorkerResponse) {
  self.postMessage(message);
}

async function getExtractor() {
  if (!extractorPromise) {
    postResponse({ type: "status", status: "warming" });
    env.allowLocalModels = false;
    env.allowRemoteModels = true;

    if (env.backends.onnx.wasm) {
      env.backends.onnx.wasm.numThreads = 1;
    }

    extractorPromise = pipeline("feature-extraction", MODEL_ID, {
      dtype: "q8",
    });
  }

  const extractor = await extractorPromise;

  if (!readyPosted) {
    readyPosted = true;
    postResponse({ type: "status", status: "ready" });
  }

  return extractor;
}

function dotProduct(a: number[], b: number[]) {
  let total = 0;

  for (let index = 0; index < a.length; index += 1) {
    total += a[index] * (b[index] ?? 0);
  }

  return total;
}

self.onmessage = async (event: MessageEvent<RerankMessage>) => {
  if (event.data.type !== "rerank") {
    return;
  }

  try {
    const extractor = await getExtractor();
    const values = [event.data.query, ...event.data.documents.map((document) => document.content)];
    const output = await extractor(values, {
      pooling: "mean",
      normalize: true,
    });
    const vectors = output.tolist() as number[][];
    const queryVector = vectors[0] ?? [];
    const documentVectors = vectors.slice(1);
    const rankings = event.data.documents
      .map((document, index) => ({
        id: document.id,
        similarity: dotProduct(queryVector, documentVectors[index] ?? []),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    postResponse({
      type: "result",
      requestId: event.data.requestId,
      rankings,
    });
  } catch (error) {
    postResponse({
      type: "error",
      requestId: event.data.requestId,
      message: error instanceof Error ? error.message : "Unable to load the local AI reranker.",
    });
  }
};

export {};
