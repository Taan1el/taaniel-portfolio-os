import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAppDefinition } from "@/lib/app-registry";
import { getSafeLocalStorage } from "@/lib/safe-storage";
import {
  PROCESS_STORAGE_KEY,
  createProcessFromApp,
  getLegacyProcessSeed,
  syncProcessStatuses,
} from "@/stores/system-runtime";
import type { AppId, AppProcess, ProcessState, WindowPayload, WindowRecord } from "@/types/system";

interface PersistedProcessV1 extends AppProcess {
  payload?: WindowPayload;
}

const processStatuses = new Set<ProcessState>(["focused", "running", "minimized"]);

function isKnownAppId(value: unknown): value is AppId {
  return typeof value === "string" && Boolean(getAppDefinition(value as AppId));
}

function sanitizeProcessStatus(value: unknown): ProcessState {
  return typeof value === "string" && processStatuses.has(value as ProcessState)
    ? (value as ProcessState)
    : "running";
}

function sanitizeWindowPayload(value: unknown): WindowPayload | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const payload = value as Record<string, unknown>;
  const sanitized: WindowPayload = {};

  if (typeof payload.filePath === "string") sanitized.filePath = payload.filePath;
  if (typeof payload.directoryPath === "string") sanitized.directoryPath = payload.directoryPath;
  if (typeof payload.title === "string") sanitized.title = payload.title;
  if (typeof payload.projectId === "string") sanitized.projectId = payload.projectId;
  if (typeof payload.externalUrl === "string") sanitized.externalUrl = payload.externalUrl;

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export function sanitizePersistedProcesses(value: unknown): AppProcess[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((process): AppProcess[] => {
    if (!process || typeof process !== "object") {
      return [];
    }

    const record = process as PersistedProcessV1;

    if (typeof record.id !== "string" || !isKnownAppId(record.appId)) {
      return [];
    }

    return [
      {
        id: record.id,
        appId: record.appId,
        status: sanitizeProcessStatus(record.status),
        launchPayload: sanitizeWindowPayload(record.launchPayload ?? record.payload),
        createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
      },
    ];
  });
}

interface ProcessStoreState {
  processes: AppProcess[];
  createProcess: (appId: AppId, payload?: WindowPayload) => AppProcess;
  updateProcess: (
    processId: string,
    partial: Partial<Omit<AppProcess, "id" | "createdAt" | "appId">>
  ) => void;
  removeProcess: (processId: string) => void;
  syncStatusesFromWindows: (windows: WindowRecord[]) => void;
  replaceProcesses: (processes: AppProcess[]) => void;
  resetProcesses: () => void;
}

const initialProcesses = getLegacyProcessSeed();

export const useProcessStore = create<ProcessStoreState>()(
  persist(
    (set, get) => ({
      processes: initialProcesses,
      createProcess: (appId, payload) => {
        const process = createProcessFromApp(appId, payload);

        set({
          processes: [...get().processes, process],
        });

        return process;
      },
      updateProcess: (processId, partial) =>
        set({
          processes: get().processes.map((process) =>
            process.id === processId
              ? {
                  ...process,
                  ...partial,
                  status: (partial.status ?? process.status) as ProcessState,
                  launchPayload: partial.launchPayload ?? process.launchPayload,
                }
              : process
          ),
        }),
      removeProcess: (processId) =>
        set({
          processes: get().processes.filter((process) => process.id !== processId),
        }),
      syncStatusesFromWindows: (windows) =>
        set({
          processes: syncProcessStatuses(windows, get().processes),
        }),
      replaceProcesses: (processes) => set({ processes }),
      resetProcesses: () => set({ processes: [] }),
    }),
    {
      name: PROCESS_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(getSafeLocalStorage),
      migrate: (persistedState) => {
        const state = persistedState as { processes?: PersistedProcessV1[] } | undefined;

        return {
          processes: sanitizePersistedProcesses(state?.processes),
        };
      },
      partialize: (state) => ({
        processes: state.processes,
      }),
    }
  )
);
