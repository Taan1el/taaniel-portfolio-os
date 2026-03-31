import { motion } from "framer-motion";

function buildCalendar(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingEmpty = (firstDay.getDay() + 6) % 7;
  const days = Array.from({ length: lastDay.getDate() }, (_, index) => index + 1);
  const cells: Array<number | null> = [...Array.from({ length: leadingEmpty }, () => null), ...days];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function CalendarPopover() {
  const today = new Date();
  const cells = buildCalendar(today);
  const monthLabel = new Intl.DateTimeFormat([], {
    month: "long",
    year: "numeric",
  }).format(today);
  const weekdayFormatter = new Intl.DateTimeFormat([], { weekday: "short" });
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    weekdayFormatter.format(new Date(2024, 0, index + 1))
  );

  return (
    <motion.div
      className="calendar-popover"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <p className="calendar-popover__label">{monthLabel}</p>
      <div className="calendar-grid calendar-grid--weekdays">
        {weekdays.map((weekday) => (
          <span key={weekday}>{weekday.slice(0, 2)}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, index) => (
          <span
            key={`${day ?? "empty"}-${index}`}
            className={day === today.getDate() ? "is-today" : undefined}
          >
            {day ?? ""}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
