import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Repeat as RepeatIcon, Trash2 } from "lucide-react";
import { addDays, addMonths, buildMonthGrid, getWeekdayLabels, shiftMonth, startOfDay, toDateKey, type CalendarMonth } from "@/lib/calendar";
import { REPEATS, eventTimeAsDate, eventsOn, parseDateKey, type CalendarEvent, type Repeat } from "@/lib/calendar-events";
import { formatTime, resolveFirstDayOfWeek, useClockPrefs } from "@/lib/clock-format";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/stores/calendar-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/calendar.css";

const CHIPS_PER_DAY = 2;
const REPEAT_LABELS: Record<Repeat, string> = { none: "Does not repeat", weekly: "Every week", monthly: "Every month", yearly: "Every year" };
const monthFormat = new Intl.DateTimeFormat([], { month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat([], { weekday: "long", day: "numeric", month: "long" });

const toMonth = (date: Date): CalendarMonth => ({ year: date.getFullYear(), month: date.getMonth() });
const blankEvent = (date: string): CalendarEvent => ({ id: "", title: "", date, time: "", notes: "", repeat: "none" });

function EventForm({ draft, onClose }: { draft: CalendarEvent; onClose: () => void }) {
  const saveEvent = useCalendarStore((state) => state.saveEvent);
  const deleteEvent = useCalendarStore((state) => state.deleteEvent);
  const [event, setEvent] = useState(draft);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const update = (change: Partial<CalendarEvent>) => setEvent((current) => ({ ...current, ...change }));
  const valid = Boolean(event.title.trim() && parseDateKey(event.date));

  useEffect(() => titleRef.current?.focus(), []);

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!valid) return;
    saveEvent({ ...event, title: event.title.trim(), id: event.id || `event-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}` });
    onClose();
  };

  return (
    <form className="calendar__form" aria-label={draft.id ? "Edit event" : "New event"} onSubmit={submit} onKeyDown={(keyEvent) => keyEvent.key === "Escape" && (keyEvent.stopPropagation(), onClose())}>
      <h2>{draft.id ? "Edit event" : "New event"}</h2>
      <label>
        Title
        <input ref={titleRef} value={event.title} maxLength={120} required onChange={(change) => update({ title: change.target.value })} />
      </label>
      <div className="calendar__pair">
        <label>
          Date
          <input type="date" value={event.date} required onChange={(change) => update({ date: change.target.value })} />
        </label>
        <label>
          Time
          <input type="time" value={event.time} aria-describedby="calendar-time-hint" onChange={(change) => update({ time: change.target.value })} />
        </label>
      </div>
      <small id="calendar-time-hint">Leave the time empty for an all-day event.</small>
      <label>
        Repeat
        <select value={event.repeat} onChange={(change) => update({ repeat: change.target.value as Repeat })}>
          {REPEATS.map((repeat) => (
            <option key={repeat} value={repeat}>
              {REPEAT_LABELS[repeat]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notes
        <textarea rows={3} value={event.notes} maxLength={1000} onChange={(change) => update({ notes: change.target.value })} />
      </label>
      <div className="calendar__form-actions">
        <button type="submit" className="calendar__primary" disabled={!valid}>
          Save
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        {draft.id ? (
          <button
            type="button"
            className="calendar__delete"
            aria-label="Delete event"
            onClick={() => {
              deleteEvent(draft.id);
              onClose();
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function CalendarApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const events = useCalendarStore((state) => state.events);
  const prefs = useClockPrefs();
  const weekStart = useMemo(() => resolveFirstDayOfWeek(prefs), [prefs]);
  const weekdays = useMemo(() => getWeekdayLabels(weekStart), [weekStart]);
  const [today] = useState(() => startOfDay(new Date()));
  const [visible, setVisible] = useState<CalendarMonth>(() => toMonth(today));
  const [selected, setSelected] = useState(today);
  const [draft, setDraft] = useState<CalendarEvent | null>(null);
  const focusTick = useRef(false);
  const gridRef = useRef<HTMLTableElement | null>(null);

  const weeks = useMemo(() => buildMonthGrid(visible, today, weekStart), [today, visible, weekStart]);
  const selectedKey = toDateKey(selected);
  const agenda = eventsOn(events, selectedKey);
  const selectedOnGrid = weeks.flat().some((day) => day.key === selectedKey);

  useEffect(() => {
    if (!focusTick.current) return;
    focusTick.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${selectedKey}"]`)?.focus({ preventScroll: true });
  }, [selectedKey, visible]);

  const select = (date: Date, focus = false) => {
    focusTick.current = focus;
    setSelected(date);
    setVisible(toMonth(date));
  };

  const handleGridKeyDown = (event: KeyboardEvent) => {
    const column = (selected.getDay() - weekStart + 7) % 7;
    const steps: Record<string, () => Date> = {
      ArrowLeft: () => addDays(selected, -1),
      ArrowRight: () => addDays(selected, 1),
      ArrowUp: () => addDays(selected, -7),
      ArrowDown: () => addDays(selected, 7),
      Home: () => addDays(selected, -column),
      End: () => addDays(selected, 6 - column),
      PageUp: () => addMonths(selected, -1),
      PageDown: () => addMonths(selected, 1),
    };
    const step = steps[event.key];

    if (step) {
      event.preventDefault();
      select(step(), true);
    } else if (event.key === "n") {
      event.preventDefault();
      setDraft(blankEvent(selectedKey));
    }
  };

  const timeOf = (event: CalendarEvent, key: string) => {
    const date = eventTimeAsDate(event, key);
    return date ? formatTime(date, prefs) : "All day";
  };

  return (
    <div className="calendar">
      <div className="calendar__frame">
        <main className="calendar__month">
          <header className="calendar__bar">
            <h1 aria-live="polite">{monthFormat.format(new Date(visible.year, visible.month, 1))}</h1>
            <span>
              <button type="button" aria-label="Previous month" onClick={() => setVisible((month) => shiftMonth(month, -1))}>
                <ChevronLeft size={16} />
              </button>
              <button type="button" aria-label="Next month" onClick={() => setVisible((month) => shiftMonth(month, 1))}>
                <ChevronRight size={16} />
              </button>
              <button type="button" className="calendar__today" onClick={() => select(today)}>
                Today
              </button>
            </span>
          </header>

          <table ref={gridRef} className="calendar__grid" role="grid" aria-label="Month" onKeyDown={handleGridKeyDown}>
            <thead>
              <tr>
                {weekdays.map((weekday) => (
                  <th key={weekday.long} scope="col" abbr={weekday.long}>
                    {weekday.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0].key}>
                  {week.map((day) => {
                    const dayEvents = eventsOn(events, day.key);
                    const isSelected = day.key === selectedKey;

                    return (
                      <td key={day.key} role="gridcell" aria-selected={isSelected}>
                        <button
                          type="button"
                          data-date={day.key}
                          tabIndex={isSelected || (!selectedOnGrid && day.inMonth && day.date.getDate() === 1) ? 0 : -1}
                          aria-label={`${dayFormat.format(day.date)}, ${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`}
                          aria-current={day.isToday ? "date" : undefined}
                          className={cn("calendar__day", !day.inMonth && "is-outside", day.isToday && "is-today", isSelected && "is-selected")}
                          onClick={() => select(day.date)}
                          onDoubleClick={() => setDraft(blankEvent(day.key))}
                        >
                          <span className="calendar__date">{day.date.getDate()}</span>
                          {dayEvents.slice(0, CHIPS_PER_DAY).map((event) => (
                            <span key={event.id} className="calendar__chip">
                              {event.title}
                            </span>
                          ))}
                          {dayEvents.length > CHIPS_PER_DAY ? <span className="calendar__more">+{dayEvents.length - CHIPS_PER_DAY} more</span> : null}
                          {dayEvents.length ? <span className="calendar__dot" aria-hidden="true" /> : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </main>

        <aside className="calendar__side">
          {draft ? (
            <EventForm key={draft.id || draft.date} draft={draft} onClose={() => setDraft(null)} />
          ) : (
            <>
              <header>
                <h2>{dayFormat.format(selected)}</h2>
                <button type="button" className="calendar__primary" onClick={() => setDraft(blankEvent(selectedKey))}>
                  <CalendarPlus size={15} aria-hidden="true" />
                  New event
                </button>
              </header>
              {agenda.length ? (
                <ul className="calendar__agenda">
                  {agenda.map((event) => (
                    <li key={event.id}>
                      <button type="button" onClick={() => setDraft(event)}>
                        <small>{timeOf(event, selectedKey)}</small>
                        <strong>{event.title}</strong>
                        {event.repeat !== "none" ? (
                          <small className="calendar__repeat">
                            <RepeatIcon size={11} aria-hidden="true" />
                            {REPEAT_LABELS[event.repeat]}
                          </small>
                        ) : null}
                        {event.notes ? <span>{event.notes}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="calendar__empty">Nothing on this day.</p>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
