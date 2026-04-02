import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = persistedState as { processes?: PersistedProcessV1[] } | undefined;

        return {
          processes:
            state?.processes?.map((process) => ({
              id: process.id,
              appId: process.appId,
              status: process.status,
              launchPayload: process.launchPayload ?? process.payload,
              createdAt: process.createdAt,
            })) ?? [],
        };
      },
      partialize: (state) => ({
        processes: state.processes,
      }),
    }
  )
);
