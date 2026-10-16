import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyShellSearchAiRankings,
  buildShellSearchAiCandidates,
  type ShellSearchAiCandidate,
  type ShellSearchAiRanking,
  type ShellSearchSection,
} from "@/lib/shell-search";
import { isAiSearchAllowed } from "@/lib/device-status";
import { selectIsNetworkBlocked, useDeviceStore } from "@/stores/device-store";
import { useSystemSettingsStore } from "@/stores/system-settings-store";

export type ShellAiSearchStatus = "local" | "warming" | "ranking" | "ready" | "fallback";

interface UseShellAiSearchOptions {
  query: string;
  sections: ShellSearchSection[];
}

const MIN_AI_QUERY_LENGTH = 3;
const MAX_AI_CANDIDATES = 18;

function createShellSearchWorker() {
  return new Worker(new URL("../workers/shell-search-ai.worker.ts", import.meta.url), {
    type: "module",
  });
}

export function useShellAiSearch({ query, sections }: UseShellAiSearchOptions) {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const [rankings, setRankings] = useState<ShellSearchAiRanking[]>([]);
  const [status, setStatus] = useState<ShellAiSearchStatus>("local");
  const trimmedQuery = query.trim();
  const networkBlocked = useDeviceStore(selectIsNetworkBlocked);
  const batterySaver = useSystemSettingsStore((state) => state.batterySaver);
  const aiAllowed = isAiSearchAllowed({ networkBlocked, batterySaver });
  const candidates = useMemo(
    () => buildShellSearchAiCandidates(sections, MAX_AI_CANDIDATES),
    [sections]
  );
  const aiSections = useMemo(
    () => applyShellSearchAiRankings(sections, rankings),
    [rankings, sections]
  );

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (trimmedQuery.length < MIN_AI_QUERY_LENGTH || candidates.length < 2) {
      setRankings([]);
      setStatus("local");
      return;
    }

    // Offline or on battery saver: no model download and no worker, just the local index.
    if (!aiAllowed) {
      requestIdRef.current += 1;
      workerRef.current?.terminate();
      workerRef.current = null;
      setRankings([]);
      setStatus("fallback");
      return;
    }

    if (!workerRef.current) {
      workerRef.current = createShellSearchWorker();
    }

    const worker = workerRef.current;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const handleMessage = (
      event: MessageEvent<
        | { type: "status"; status: "warming" | "ready" }
        | { type: "result"; requestId: number; rankings: ShellSearchAiRanking[] }
        | { type: "error"; requestId: number; message: string }
      >
    ) => {
      const message = event.data;

      if (message.type === "status") {
        setStatus((current) => {
          if (message.status === "warming") {
            return current === "ready" ? "ranking" : "warming";
          }

          return current === "ranking" ? "ranking" : "ready";
        });
        return;
      }

      if (message.requestId !== requestIdRef.current) {
        return;
      }

      if (message.type === "result") {
        setRankings(message.rankings);
        setStatus("ready");
        return;
      }

      console.warn("[shell-search-ai]", message.message);
      setRankings([]);
      setStatus("fallback");
    };

    setRankings([]);
    setStatus((current) => (current === "ready" ? "ranking" : "warming"));
    worker.addEventListener("message", handleMessage);
    worker.postMessage({
      type: "rerank",
      requestId,
      query: trimmedQuery,
      documents: candidates,
    } satisfies {
      type: "rerank";
      requestId: number;
      query: string;
      documents: ShellSearchAiCandidate[];
    });

    return () => {
      worker.removeEventListener("message", handleMessage);
    };
  }, [aiAllowed, candidates, trimmedQuery]);

  return {
    sections: rankings.length > 0 ? aiSections : sections,
    aiStatus: status,
    aiEnabled: trimmedQuery.length >= MIN_AI_QUERY_LENGTH,
  };
}
