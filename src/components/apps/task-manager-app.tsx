import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Activity, ListTree, Maximize2, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { getAppDefinition } from "@/lib/app-registry";
import { HISTORY_SECONDS, buildTaskRows, chartPoints, formatDuration, pushSample, readHeapBytes, startFrameMeter } from "@/lib/task-manager";
import { cn, formatBytes } from "@/lib/utils";
import { useProcessStore } from "@/stores/process-store";
import { useShellStore } from "@/stores/shell-store";
import { useSystemStore } from "@/stores/system-store";
import { useWindowStore } from "@/stores/window-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/task-manager.css";

function Chart({ label, history, peak, unit }: { label: string; history: number[]; peak: number; unit: string }) {
  const current = history.at(-1);

  return (
    <section className="tasks__chart" aria-label={label}>
      <header>
        <strong>{label}</strong>
        <span>{current === undefined ? "Measuring" : `${current} ${unit}`}</span>
      </header>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={chartPoints(history, peak)} vectorEffect="non-scaling-stroke" />
      </svg>
      <footer>
        <span>{HISTORY_SECONDS} seconds</span>
        <span>0</span>
      </footer>
    </section>
  );
}

export function TaskManagerApp({ window: appWindow }: AppComponentProps) {
  void appWindow;
  const [tab, setTab] = useState<"processes" | "performance">("processes");
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const [frames, setFrames] = useState<number[]>([]);
  const [heap, setHeap] = useState<number | null>(readHeapBytes);
  const [nodes, setNodes] = useState(0);
  const [stored, setStored] = useState<number | null>(null);

  const windows = useWindowStore((state) => state.windows);
  const processes = useProcessStore((state) => state.processes);
  const focusedWindowId = useShellStore((state) => state.focusedWindowId);
  const { closeWindow, focusWindow } = useSystemStore(useShallow((state) => ({ closeWindow: state.closeWindow, focusWindow: state.focusWindow })));

  const rows = useMemo(() => buildTaskRows(windows, processes, focusedWindowId), [focusedWindowId, processes, windows]);
  const current = rows.find((row) => row.windowId === selected);

  useEffect(() => {
    const clock = globalThis.setInterval(() => {
      if (document.hidden) return;
      setNow(Date.now());
      setHeap(readHeapBytes());
      setNodes(document.getElementsByTagName("*").length);
    }, 1000);
    return () => globalThis.clearInterval(clock);
  }, []);

  useEffect(() => startFrameMeter((sample) => setFrames((history) => pushSample(history, sample))), []);

  useEffect(() => {
    void navigator.storage?.estimate?.().then((estimate) => setStored(estimate.usage ?? null));
  }, []);

  const endTask = (windowId: string) => {
    closeWindow(windowId);
    setSelected(null);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const index = rows.findIndex((row) => row.windowId === selected);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = rows[Math.min(rows.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)))];
      if (next) {
        setSelected(next.windowId);
        document.getElementById(`task-${next.windowId}`)?.focus();
      }
    } else if (event.key === "Delete" && current) {
      event.preventDefault();
      endTask(current.windowId);
    } else if (event.key === "Enter" && current) {
      event.preventDefault();
      focusWindow(current.windowId);
    }
  };

  const facts = [
    ["Open windows", String(windows.length)],
    ["Page uptime", formatDuration(performance.now())],
    ["Page elements", nodes ? nodes.toLocaleString("en-GB") : "Measuring"],
    ...(heap === null ? [] : [["JavaScript memory", formatBytes(heap)]]),
    ...(stored === null ? [] : [["Saved in this browser", formatBytes(stored)]]),
    ["Logical processors", navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : "Not reported"],
  ];

  return (
    <div className="tasks">
      <div className="tasks__frame">
      <nav className="tasks__tabs" role="tablist" aria-label="Task Manager">
        {[
          { id: "processes" as const, label: "Processes", icon: ListTree },
          { id: "performance" as const, label: "Performance", icon: Activity },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={cn(tab === id && "is-active")} onClick={() => setTab(id)}>
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {tab === "processes" ? (
        <main className="tasks__main">
          <div className="tasks__bar">
            <h1>Processes</h1>
            <span>
              <button type="button" disabled={!current} onClick={() => current && focusWindow(current.windowId)}>
                <Maximize2 size={14} aria-hidden="true" />
                Switch to
              </button>
              <button type="button" disabled={!current} onClick={() => current && endTask(current.windowId)}>
                <X size={14} aria-hidden="true" />
                End task
              </button>
            </span>
          </div>

          <div className="tasks__scroll">
            <table className="tasks__table" onKeyDown={handleKeyDown}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="tasks__wide">Desktop</th>
                  <th scope="col" className="tasks__wide">Running for</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const Icon = getAppDefinition(row.appId).icon;

                  return (
                    <tr
                      key={row.windowId}
                      id={`task-${row.windowId}`}
                      tabIndex={0}
                      aria-selected={selected === row.windowId}
                      className={cn(selected === row.windowId && "is-selected")}
                      onClick={() => setSelected(row.windowId)}
                      onFocus={() => setSelected(row.windowId)}
                      onDoubleClick={() => focusWindow(row.windowId)}
                    >
                      <td>
                        <span className="tasks__name">
                          <Icon size={18} />
                          <span>{row.title}</span>
                        </span>
                      </td>
                      <td>{row.status}</td>
                      <td className="tasks__wide">{row.desktop}</td>
                      <td className="tasks__wide tasks__time">{formatDuration(now - row.startedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="tasks__count">
            {rows.length} {rows.length === 1 ? "app" : "apps"} running. Delete ends the selected task.
          </p>
        </main>
      ) : (
        <main className="tasks__main tasks__main--performance">
          <div className="tasks__bar">
            <h1>Performance</h1>
          </div>
          <Chart label="Frame rate" history={frames} peak={60} unit="fps" />
          <dl className="tasks__facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </main>
      )}
      </div>
    </div>
  );
}
