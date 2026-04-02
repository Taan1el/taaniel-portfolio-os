import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  PROCESS_STORAGE_KEY,
  createProcessFromApp,
  getLegacyProcessSeed,
  syncProcessStatuses,
} from "@/stores/system-runtime";
import type { AppId, AppProcess, ProcessState, WindowPayload, WindowRecord } from "@/types/system";

interface ProcessStoreState {
  processes: AppProcess[];
  createProcess: (appId: AppId, title: string, payload?: WindowPayload) => AppProcess;
  updateProcess: (processId: string, partial: Partial<Omit<AppProcess, "id" | "createdAt" | "appId">>) => void;
  removeProcess: (processId: string) => void;
  syncStatusesFromWindows: (windows: WindowRecord[], activeWindowId: string | null) => void;
  replaceProcesses: (processes: AppProcess[]) => void;
  resetProcesses: () => void;
}

const initialProcesses = getLegacyProcessSeed();

export const useProcessStore = create<ProcessStoreState>()(
  persist(
    (set, get) => ({
      processes: initialProcesses,
      createProcess: (appId, title, payload) => {
        const process = createProcessFromApp(appId, title, payload);

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
                }
              : process
          ),
        }),
      removeProcess: (processId) =>
        set({
          processes: get().processes.filter((process) => process.id !== processId),
        }),
      syncStatusesFromWindows: (windows, activeWindowId) =>
        set({
          processes: syncProcessStatuses(windows, get().processes, activeWindowId),
        }),
      replaceProcesses: (processes) => set({ processes }),
      resetProcesses: () => set({ processes: [] }),
    }),
    {
      name: PROCESS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        processes: state.processes,
      }),
    }
  )
);
