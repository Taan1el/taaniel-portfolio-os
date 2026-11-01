import { memo, useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Download, FileUp, Redo2, Save, Sigma, Undo2 } from "lucide-react";
import { useDocumentFile } from "@/hooks/use-document-file";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { COLUMNS, ROWS, SheetError, cellKey, columnName, type CellRef, type CellValue } from "@/lib/sheet/formula";
import {
  NUMBER_FORMATS,
  clearCells,
  computeSheet,
  copyCells,
  fillDown,
  formatValue,
  parseSheet,
  parseTsv,
  pasteCells,
  selectionBounds,
  selectionKeys,
  selectionName,
  serializeSheet,
  sheetFromCsv,
  summarize,
  toCsv,
  toTsv,
  type CellStyle,
  type NumberFormat,
  type Selection,
  type SheetData,
} from "@/lib/sheet/sheet";
import { UndoHistory, undoKey } from "@/lib/undo-history";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/spreadsheet.css";

const DRAFT_KEY = "taaniel-os-spreadsheet-draft";
const FORMAT_LABELS: Record<NumberFormat, string> = { general: "General", number: "1,000.00", percent: "Percent", euro: "Euro" };
const COLUMN_INDEXES = Array.from({ length: COLUMNS }, (_, index) => index);
const ROW_INDEXES = Array.from({ length: ROWS }, (_, index) => index);

const Cell = memo(function Cell({
  id,
  text,
  column,
  row,
  style,
  numeric,
  error,
  selected,
  active,
}: {
  id: string;
  text: string;
  column: number;
  row: number;
  style?: CellStyle;
  numeric: boolean;
  error: boolean;
  selected: boolean;
  active: boolean;
}) {
  return (
    <td
      id={id}
      role="gridcell"
      data-column={column}
      data-row={row}
      aria-selected={selected}
      title={error ? text : undefined}
      className={cn("sheet__cell", selected && "is-selected", active && "is-active", error && "is-error", style?.bold && "is-bold", (style?.align ?? (numeric ? "right" : "left")) === "right" && "is-right", style?.align === "center" && "is-center")}
    >
      {text}
    </td>
  );
});

const isNumeric = (value: CellValue | undefined) => typeof value === "number";

function clampRef(column: number, row: number): CellRef {
  return { column: Math.min(COLUMNS - 1, Math.max(0, column)), row: Math.min(ROWS - 1, Math.max(0, row)) };
}

export function SpreadsheetApp({ window: appWindow }: AppComponentProps) {
  const document_ = useDocumentFile(appWindow, { defaultName: "Sheet.sheet", extension: "sheet", mimeType: "application/json" });
  const createFile = useFileSystemStore((state) => state.writeFile);
  const isCsv = document_.file?.extension === "csv";
  const [data, setData] = useState<SheetData>(() => {
    if (isCsv) return sheetFromCsv(document_.file?.content ?? "");
    return parseSheet(document_.file ? document_.file.content : readLocalStorage(DRAFT_KEY) ?? undefined);
  });
  const [selection, setSelection] = useState<Selection>({ anchor: { column: 0, row: 0 }, focus: { column: 0, row: 0 } });
  /** The cell being typed in, or null. */
  const [editing, setEditing] = useState<{ key: string; text: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const history = useRef(new UndoHistory<SheetData>(100));
  const gridRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const copied = useRef<{ text: string; rows: string[][]; from: CellRef } | null>(null);
  const dragging = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const values = useMemo(() => computeSheet(data.cells), [data.cells]);
  const bounds = selectionBounds(selection);
  const activeKey = cellKey(selection.anchor.column, selection.anchor.row);
  const summary = useMemo(() => summarize(values, selection), [selection, values]);
  const rawActive = data.cells[activeKey] ?? "";
  const barText = editing ? editing.text : rawActive;
  const editingFormula = Boolean(editing?.text.startsWith("="));

  const syncHistory = () => {
    setCanUndo(history.current.canUndo);
    setCanRedo(history.current.canRedo);
  };

  /** A .csv file stays a .csv: results only, as the format has no formulas or styles. */
  const fileText = useCallback(
    (sheet: SheetData) => (isCsv ? toCsv(computeSheet(sheet.cells), sheet) : serializeSheet(sheet)),
    [isCsv]
  );

  const persist = useCallback(
    (next: SheetData) => {
      if (document_.file) document_.change(fileText(next));
      else writeLocalStorage(DRAFT_KEY, serializeSheet(next));
    },
    [document_, fileText]
  );

  const commit = useCallback(
    (next: SheetData) => {
      history.current.record(dataRef.current);
      syncHistory();
      setData(next);
      persist(next);
    },
    [persist]
  );

  const step = (direction: "undo" | "redo") => {
    const restored = direction === "undo" ? history.current.undo(dataRef.current) : history.current.redo(dataRef.current);
    if (!restored) return;
    syncHistory();
    setData(restored);
    persist(restored);
  };

  const select = (ref: CellRef, extend = false) => {
    const clamped = clampRef(ref.column, ref.row);
    setSelection((current) => (extend ? { anchor: current.anchor, focus: clamped } : { anchor: clamped, focus: clamped }));
    document.getElementById(`${appWindow.id}-${cellKey(clamped.column, clamped.row)}`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const focusGrid = () => gridRef.current?.focus({ preventScroll: true });

  /** Saves the typed value. `move` steps to the next cell, as Enter and Tab do. */
  const finishEdit = (move?: [number, number]) => {
    if (!editing) return;
    const text = editing.text;
    const cells = { ...dataRef.current.cells };
    if (text === "") delete cells[editing.key];
    else cells[editing.key] = text;
    setEditing(null);
    if ((dataRef.current.cells[editing.key] ?? "") !== text) commit({ ...dataRef.current, cells });
    if (move) select({ column: selection.anchor.column + move[0], row: selection.anchor.row + move[1] });
    focusGrid();
  };

  const startEdit = (text?: string) => {
    setEditing({ key: activeKey, text: text ?? rawActive });
  };

  useEffect(() => {
    if (!editing) return;
    const input = editorRef.current;
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(editing.text.length, editing.text.length);
    // Only as editing begins, not on each key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.key]);

  const insertRef = (name: string) => {
    if (!editing) return;
    const input = editorRef.current;
    const at = input?.selectionStart ?? editing.text.length;
    const end = input?.selectionEnd ?? at;
    const text = `${editing.text.slice(0, at)}${name}${editing.text.slice(end)}`;
    setEditing({ ...editing, text });
    requestAnimationFrame(() => {
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(at + name.length, at + name.length);
    });
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
    if (!cell) return;
    const ref = { column: Number(cell.dataset.column), row: Number(cell.dataset.row) };

    // While typing a formula, clicking a cell adds its reference.
    if (editingFormula) {
      event.preventDefault();
      insertRef(cellKey(ref.column, ref.row));
      return;
    }

    if (editing) finishEdit();
    dragging.current = true;
    select(ref, event.shiftKey);
  };

  const handlePointerOver = (event: ReactPointerEvent) => {
    if (!dragging.current) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
    if (cell) setSelection((current) => ({ anchor: current.anchor, focus: { column: Number(cell.dataset.column), row: Number(cell.dataset.row) } }));
  };

  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    globalThis.window.addEventListener("pointerup", stop);
    return () => globalThis.window.removeEventListener("pointerup", stop);
  }, []);

  const applyStyle = (change: (style: CellStyle) => CellStyle) => {
    const styles = { ...data.styles };
    for (const key of selectionKeys(selection)) {
      const next = change(styles[key] ?? {});
      if (Object.keys(next).length) styles[key] = next;
      else delete styles[key];
    }
    commit({ ...data, styles });
  };

  const handleGridKeyDown = (event: KeyboardEvent) => {
    if (event.target !== gridRef.current) return;
    const direction = undoKey(event);
    const { column, row } = selection.focus;
    const ctrl = event.ctrlKey || event.metaKey;
    const key = event.key;
    const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

    if (direction) step(direction);
    else if (ctrl && key.toLowerCase() === "b") applyStyle((style) => ({ ...style, bold: style.bold ? undefined : true }));
    else if (ctrl && key.toLowerCase() === "d") commit(fillDown(data, selection));
    else if (ctrl && key.toLowerCase() === "a") setSelection({ anchor: { column: 0, row: 0 }, focus: { column: COLUMNS - 1, row: ROWS - 1 } });
    else if (ctrl && key.toLowerCase() === "s") void saveSheet();
    else if (ctrl) return;
    else if (moves[key]) select({ column: column + moves[key][0], row: row + moves[key][1] }, event.shiftKey);
    else if (key === "Tab") select({ column: selection.anchor.column + (event.shiftKey ? -1 : 1), row: selection.anchor.row });
    else if (key === "Enter") select({ column: selection.anchor.column, row: selection.anchor.row + (event.shiftKey ? -1 : 1) });
    else if (key === "Home") select({ column: 0, row });
    else if (key === "F2") startEdit();
    else if (key === "Delete" || key === "Backspace") commit(clearCells(data, selection));
    else if (key.length === 1 && !event.altKey) startEdit(key);
    else return;
    event.preventDefault();
  };

  const handleEditorKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finishEdit([0, event.shiftKey ? -1 : 1]);
    } else if (event.key === "Tab") {
      event.preventDefault();
      finishEdit([event.shiftKey ? -1 : 1, 0]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setEditing(null);
      focusGrid();
    }
  };

  const handleCopy = (event: ClipboardEvent, cut = false) => {
    if (editing) return;
    event.preventDefault();
    const text = toTsv(values, data, selection);
    const { rows, column, row } = copyCells(data, selection);
    copied.current = { text, rows, from: { column, row } };
    event.clipboardData.setData("text/plain", text);
    if (cut) commit(clearCells(data, selection));
  };

  const handlePaste = (event: ClipboardEvent) => {
    if (editing) return;
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    const target = { column: bounds.left, row: bounds.top };
    // From this sheet, formulas travel as formulas. From anywhere else it is plain text.
    if (copied.current?.text === text) commit(pasteCells(data, copied.current.rows, target, copied.current.from));
    else if (text) commit(pasteCells(data, parseTsv(text), target, null));
  };

  const saveSheet = async () => {
    await document_.save(fileText(data));
    setNotice("");
  };

  const exportCsv = async () => {
    const path = await createFile(`/Documents/${document_.name.replace(/\.[^.]+$/, "")}.csv`, toCsv(values, data), { extension: "csv", mimeType: "text/csv", uniqueName: true });
    setNotice(`Saved ${path.split("/").pop()} to Documents`);
  };

  const importCsv = async (file: File | undefined) => {
    if (!file) return;
    commit(sheetFromCsv(await file.text()));
    setNotice(`Imported ${file.name}`);
  };

  const autoSum = () => {
    const { left, right, top, bottom } = bounds;
    const target = bottom + (top === bottom ? 0 : 1);
    // One cell below a column of numbers, like the Sum button everywhere else.
    const from = top === bottom ? Math.max(0, top - 1) : top;
    let first = from;
    while (top === bottom && first > 0 && isNumeric(values.get(cellKey(left, first - 1)))) first -= 1;
    const key = cellKey(left, Math.min(ROWS - 1, target));
    if (left !== right) return;
    commit({ ...data, cells: { ...data.cells, [key]: `=SUM(${cellKey(left, first)}:${cellKey(left, top === bottom ? from : bottom)})` } });
    select({ column: left, row: Math.min(ROWS - 1, target) });
  };

  const activeStyle = data.styles[activeKey] ?? {};

  return (
    <div className="sheet">
      <div className="sheet__toolbar" role="toolbar" aria-label="Spreadsheet">
        <button type="button" aria-label="Save" title="Save (Ctrl+S)" onClick={() => void saveSheet()}>
          <Save size={16} />
        </button>
        <button type="button" aria-label="Import CSV" title="Import CSV" onClick={() => importRef.current?.click()}>
          <FileUp size={16} />
        </button>
        <button type="button" aria-label="Export CSV" title="Export CSV" onClick={() => void exportCsv()}>
          <Download size={16} />
        </button>
        <input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => void importCsv(event.target.files?.[0])} />
        <span className="sheet__rule" aria-hidden="true" />
        <button type="button" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => step("undo")}>
          <Undo2 size={16} />
        </button>
        <button type="button" aria-label="Redo" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={() => step("redo")}>
          <Redo2 size={16} />
        </button>
        <span className="sheet__rule" aria-hidden="true" />
        <button type="button" aria-label="Bold" aria-pressed={Boolean(activeStyle.bold)} title="Bold (Ctrl+B)" className={cn(activeStyle.bold && "is-on")} onClick={() => applyStyle((style) => ({ ...style, bold: style.bold ? undefined : true }))}>
          <Bold size={16} />
        </button>
        {(["left", "center", "right"] as const).map((align) => {
          const Icon = { left: AlignLeft, center: AlignCenter, right: AlignRight }[align];
          return (
            <button key={align} type="button" aria-label={`Align ${align}`} aria-pressed={activeStyle.align === align} className={cn(activeStyle.align === align && "is-on")} onClick={() => applyStyle((style) => ({ ...style, align: style.align === align ? undefined : align }))}>
              <Icon size={16} />
            </button>
          );
        })}
        <select aria-label="Number format" value={activeStyle.format ?? "general"} onChange={(event) => applyStyle((style) => ({ ...style, format: event.target.value === "general" ? undefined : (event.target.value as NumberFormat) }))}>
          {NUMBER_FORMATS.map((format) => (
            <option key={format} value={format}>
              {FORMAT_LABELS[format]}
            </option>
          ))}
        </select>
        <button type="button" aria-label="Sum" title="Sum the numbers above" onClick={autoSum}>
          <Sigma size={16} />
        </button>
      </div>

      <div className="sheet__bar">
        <output className="sheet__name" aria-label="Selected cells">
          {selectionName(selection)}
        </output>
        <span className="sheet__fx" aria-hidden="true">
          fx
        </span>
        <input
          ref={editorRef}
          className="sheet__formula"
          aria-label="Formula"
          value={barText}
          maxLength={2000}
          spellCheck={false}
          onFocus={() => !editing && startEdit()}
          onChange={(event) => setEditing({ key: editing?.key ?? activeKey, text: event.target.value })}
          onKeyDown={handleEditorKeyDown}
          onBlur={(event) => {
            // Leaving for a cell while building a formula is not the end of the edit.
            if (!editingFormula && !event.relatedTarget) finishEdit();
          }}
        />
      </div>

      <div
        ref={gridRef}
        className="sheet__scroll"
        tabIndex={0}
        role="grid"
        aria-label="Spreadsheet cells"
        aria-rowcount={ROWS + 1}
        aria-colcount={COLUMNS + 1}
        aria-activedescendant={`${appWindow.id}-${activeKey}`}
        onKeyDown={handleGridKeyDown}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onDoubleClick={(event) => (event.target as HTMLElement).closest("[data-row]") && startEdit()}
        onCopy={(event) => handleCopy(event)}
        onCut={(event) => handleCopy(event, true)}
        onPaste={handlePaste}
      >
        <table className="sheet__table">
          <thead>
            <tr>
              <th className="sheet__corner" />
              {COLUMN_INDEXES.map((column) => (
                <th key={column} scope="col" className={cn(column >= bounds.left && column <= bounds.right && "is-lit")}>
                  {columnName(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_INDEXES.map((row) => (
              <tr key={row}>
                <th scope="row" className={cn(row >= bounds.top && row <= bounds.bottom && "is-lit")}>
                  {row + 1}
                </th>
                {COLUMN_INDEXES.map((column) => {
                  const key = cellKey(column, row);
                  const value = values.get(key);
                  const text = editing?.key === key ? editing.text : formatValue(value, data.styles[key]?.format).replace(/^'/, "");

                  return (
                    <Cell
                      key={key}
                      id={`${appWindow.id}-${key}`}
                      text={text}
                      column={column}
                      row={row}
                      style={data.styles[key]}
                      numeric={isNumeric(value)}
                      error={value instanceof SheetError}
                      selected={column >= bounds.left && column <= bounds.right && row >= bounds.top && row <= bounds.bottom}
                      active={key === activeKey}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="sheet__status">
        <span>
          {document_.file ? `${document_.file.name} · ${document_.status === "unsaved" ? "Saving" : "Saved"}` : "Draft, kept in this browser"}
          {notice ? ` · ${notice}` : ""}
        </span>
        {summary.count > 1 ? (
          <span>
            Sum {summary.sum} · Average {summary.average} · Count {summary.count}
          </span>
        ) : null}
      </footer>
    </div>
  );
}

