import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { sanitizeEvents, type CalendarEvent } from "@/lib/calendar-events";
import { getSafeLocalStorage } from "@/lib/safe-storage";

interface CalendarState {
  events: CalendarEvent[];
  saveEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      saveEvent: (event) =>
        set((state) => ({
          events: state.events.some((entry) => entry.id === event.id)
            ? state.events.map((entry) => (entry.id === event.id ? event : entry))
            : [...state.events, event],
        })),
      deleteEvent: (id) => set((state) => ({ events: state.events.filter((entry) => entry.id !== id) })),
    }),
    {
      name: "taaniel-os-calendar-v1",
      storage: createJSONStorage(getSafeLocalStorage),
      merge: (persisted, current) => ({ ...current, events: sanitizeEvents((persisted as { events?: unknown } | undefined)?.events) }),
      partialize: (state) => ({ events: state.events }),
    }
  )
);
