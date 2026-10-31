import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { useFlyout } from "@/hooks/use-flyout";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { useSecondClock } from "@/hooks/use-second-clock";
import { formatTime, resolveFirstDayOfWeek, useClockPrefs } from "@/lib/clock-format";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  getWeekdayLabels,
  isSameDay,
  shiftMonth,
  startOfDay,
  toDateKey,
  type CalendarDay,
  type CalendarMonth,
} from "@/lib/calendar";
import type { SettingsSectionId } from "@/lib/settings-sections";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/stores/shell-store";

interface ClockFlyoutProps {
  onOpenSettings: (section: SettingsSectionId) => void;
}

const dateFormat = new Intl.DateTimeFormat([], { weekday: "long", month: "long", day: "numeric" });
const monthFormat = new Intl.DateTimeFormat([], { month: "long", year: "numeric" });
const dayLabelFormat = new Intl.DateTimeFormat([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function toMonth(date: Date): CalendarMonth {
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** The big clock and date. Its own component, so the calendar below does not re-render every second. */
function FlyoutClock() {
  const now = useSecondClock();
  const prefs = useClockPrefs();

  return (
    <header className="w11-clock__header">
      <time className="w11-clock__time" dateTime={now.toISOString()}>
        {formatTime(now, prefs, { seconds: true })}
      </time>
      <span className="w11-clock__date">{dateFormat.format(now)}</span>
    </header>
  );
}

/**
 * The clock's flyout: the time with seconds, today's date, and a month
 * calendar you can page through. The calendar is a keyboard grid: arrows move
 * by day and week, Home/End by row, Page Up/Down by month.
 */
export function ClockFlyout({ onOpenSettings }: ClockFlyoutProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const focusedDayRef = useRef<HTMLButtonElement | null>(null);
  const labelId = useId();
  const close = useCallback(() => useShellStore.getState().setCalendarOpen(false), []);
  useFlyout({ open: true, triggerId: "clock", panelRef, onClose: close, initialFocusRef: focusedDayRef });

  const now = useMinuteClock();
  const prefs = useClockPrefs();
  const weekStart = useMemo(() => resolveFirstDayOfWeek(prefs), [prefs]);
  const weekdays = useMemo(() => getWeekdayLabels(weekStart), [weekStart]);
  const [visible, setVisible] = useState<CalendarMonth>(() => toMonth(new Date()));
  const [focused, setFocused] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  const weeks = useMemo(() => buildMonthGrid(visible, startOfDay(now), weekStart), [now, visible, weekStart]);

  // The one day that takes Tab; falls back to the 1st if the focused day is off this grid.
  const focusedKey = toDateKey(focused);
  const activeKey = weeks.flat().some((day) => day.key === focusedKey)
    ? focusedKey
    : (weeks.flat().find((day) => day.inMonth)?.key ?? focusedKey);

  useEffect(() => {
    if (focusTick > 0) {
      focusedDayRef.current?.focus({ preventScroll: true });
    }
  }, [focusTick]);

  const moveFocus = (next: Date) => {
    setFocused(next);
    setVisible(toMonth(next));
    setFocusTick((tick) => tick + 1);
  };

  const showMonth = (amount: number) => {
    setFocused((current) => addMonths(current, amount));
    setVisible((current) => shiftMonth(current, amount));
  };

  const goToToday = () => {
    const today = startOfDay(new Date());

    setSelected(null);
    moveFocus(today);
  };

  const selectDay = (day: CalendarDay) => {
    setSelected(day.date);
    setFocused(day.date);

    if (!day.inMonth) {
      setVisible(toMonth(day.date));
    }
  };

  const handleGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const column = (focused.getDay() - weekStart + 7) % 7;
    let next: Date | null = null;

    switch (event.key) {
      case "ArrowLeft":
        next = addDays(focused, -1);
        break;
      case "ArrowRight":
        next = addDays(focused, 1);
        break;
      case "ArrowUp":
        next = addDays(focused, -7);
        break;
      case "ArrowDown":
        next = addDays(focused, 7);
        break;
      case "Home":
        next = addDays(focused, -column);
        break;
      case "End":
        next = addDays(focused, 6 - column);
        break;
      case "PageUp":
        next = addMonths(focused, event.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(focused, event.shiftKey ? 12 : 1);
        break;
    }

    if (next) {
      event.preventDefault();
      moveFocus(next);
    }
  };

  const viewingToday = visible.year === now.getFullYear() && visible.month === now.getMonth();

  return (
    <motion.div
      ref={panelRef}
      className="w11-flyout w11-clock"
      role="dialog"
      aria-label="Calendar"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.18, ease: [0, 0, 0, 1] }}
    >
      <FlyoutClock />

      <section className="w11-clock__calendar" aria-label="Month calendar">
        <div className="w11-clock__nav">
          <h2 className="w11-clock__month" id={labelId} aria-live="polite">
            {monthFormat.format(new Date(visible.year, visible.month, 1))}
          </h2>
          {viewingToday ? null : (
            <button type="button" className="w11-clock__today" onClick={goToToday}>
              Today
            </button>
          )}
          <button
            type="button"
            className="w11-clock__step"
            aria-label="Previous month"
            onClick={() => showMonth(-1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" className="w11-clock__step" aria-label="Next month" onClick={() => showMonth(1)}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <table className="w11-clock__grid" role="grid" aria-labelledby={labelId} onKeyDown={handleGridKeyDown}>
          <thead>
            <tr>
              {weekdays.map((weekday) => (
                <th key={weekday.long} scope="col" abbr={weekday.long}>
                  {weekday.short.slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].key}>
                {week.map((day) => {
                  const isActive = day.key === activeKey;

                  return (
                    <td
                      key={day.key}
                      role="gridcell"
                      aria-selected={selected ? isSameDay(day.date, selected) : false}
                    >
                      <button
                        ref={isActive ? focusedDayRef : undefined}
                        type="button"
                        className={cn(
                          "w11-clock__day",
                          !day.inMonth && "is-outside",
                          day.isToday && "is-today",
                          selected && isSameDay(day.date, selected) && "is-selected"
                        )}
                        data-date={day.key}
                        tabIndex={isActive ? 0 : -1}
                        aria-label={dayLabelFormat.format(day.date)}
                        aria-current={day.isToday ? "date" : undefined}
                        onClick={() => selectDay(day)}
                      >
                        {day.date.getDate()}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="w11-clock__footer">
        <button type="button" className="w11-clock__settings" onClick={() => onOpenSettings("time")}>
          <SettingsIcon size={16} aria-hidden="true" />
          Date and time settings
        </button>
      </footer>
    </motion.div>
  );
}
