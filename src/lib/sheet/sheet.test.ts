import { describe, expect, it } from "vitest";
import { SheetError } from "@/lib/sheet/formula";
import {
  clearCells,
  computeSheet,
  copyCells,
  emptySheet,
  fillDown,
  formatValue,
  literalValue,
  parseCsv,
  parseSheet,
  parseTsv,
  pasteCells,
  selectionKeys,
  selectionName,
  serializeSheet,
  sheetFromCsv,
  summarize,
  toCsv,
  toTsv,
  type SheetData,
} from "@/lib/sheet/sheet";

const sheet = (cells: Record<string, string>): SheetData => ({ cells, styles: {} });
const at = (column: number, row: number) => ({ column, row });
const pick = (from: [number, number], to: [number, number]) => ({ anchor: at(...from), focus: at(...to) });

describe("typed values", () => {
  it.each([
    ["12", 12],
    ["-1.5", -1.5],
    ["1e3", 1000],
    ["50%", 0.5],
    ["TRUE", true],
    ["false", false],
    ["", null],
    ["  ", null],
    ["hello", "hello"],
    ["12 apples", "12 apples"],
  ])("%s", (raw, expected) => {
    expect(literalValue(raw)).toBe(expected);
  });
});

describe("computing a sheet", () => {
  it("follows chains in any order", () => {
    const values = computeSheet({ A1: "=B1*2", B1: "=C1+1", C1: "4" });

    expect(values.get("A1")).toBe(10);
  });

  it("marks a loop", () => {
    const values = computeSheet({ A1: "=B1", B1: "=A1", C1: "=A1+1", D1: "=D1" });

    expect((values.get("A1") as SheetError).code).toBe("#CIRC!");
    expect((values.get("C1") as SheetError).code).toBe("#CIRC!");
    expect((values.get("D1") as SheetError).code).toBe("#CIRC!");
  });

  it("copes with a loop through a range", () => {
    expect(computeSheet({ A1: "=SUM(A1:A3)", A2: "1" }).get("A1")).toBeInstanceOf(SheetError);
  });

  it("computes a very long chain without running out of stack", () => {
    const cells: Record<string, string> = { A1: "1" };
    for (let row = 2; row <= 100; row += 1) cells[`A${row}`] = `=A${row - 1}+1`;
    for (let column = 1; column < 26; column += 1) {
      const name = String.fromCharCode(65 + column);
      const previous = String.fromCharCode(64 + column);
      cells[`${name}1`] = `=${previous}100+1`;
      for (let row = 2; row <= 100; row += 1) cells[`${name}${row}`] = `=${name}${row - 1}+1`;
    }

    expect(computeSheet(cells).get("Z100")).toBe(2600);
  });

  it("treats a lone equals sign as text", () => {
    expect(computeSheet({ A1: "=" }).get("A1")).toBe("=");
  });
});

describe("showing values", () => {
  it("hides rounding noise", () => {
    expect(formatValue(computeSheet({ A1: "=0.1+0.2" }).get("A1"))).toBe("0.3");
  });

  it("formats numbers", () => {
    expect(formatValue(1234.5, "number")).toBe("1,234.50");
    expect(formatValue(0.25, "percent")).toBe("25%");
    expect(formatValue(1234.5, "euro")).toBe("€1,234.50");
    expect(formatValue("text", "euro")).toBe("text");
  });

  it("shows blanks, booleans and errors", () => {
    expect(formatValue(null)).toBe("");
    expect(formatValue(undefined)).toBe("");
    expect(formatValue(true)).toBe("TRUE");
    expect(formatValue(new SheetError("#REF!"))).toBe("#REF!");
  });
});

describe("selections", () => {
  it("works however it was dragged", () => {
    const selection = pick([1, 1], [0, 0]);

    expect(selectionName(selection)).toBe("A1:B2");
    expect(selectionKeys(selection)).toEqual(["A1", "B1", "A2", "B2"]);
    expect(selectionName(pick([2, 2], [2, 2]))).toBe("C3");
  });

  it("sums only the numbers", () => {
    const values = computeSheet({ A1: "2", A2: "x", A3: "4" });

    expect(summarize(values, pick([0, 0], [0, 2]))).toEqual({ count: 2, sum: 6, average: 3 });
  });
});

describe("copy, paste and fill", () => {
  it("moves formulas relative to where they land", () => {
    const data = sheet({ A1: "1", B1: "=A1*2" });
    const copied = copyCells(data, pick([1, 0], [1, 0]));
    const next = pasteCells(data, copied.rows, at(1, 4), at(copied.column, copied.row));

    expect(next.cells.B5).toBe("=A5*2");
  });

  it("pastes plain text exactly", () => {
    expect(pasteCells(emptySheet(), parseTsv("a\tb\nc\td\n"), at(0, 0), null).cells).toEqual({ A1: "a", B1: "b", A2: "c", B2: "d" });
  });

  it("stops at the edge of the sheet", () => {
    const next = pasteCells(emptySheet(), [["a", "b"]], at(25, 99), null);

    expect(Object.keys(next.cells)).toEqual(["Z100"]);
  });

  it("fills down", () => {
    const next = fillDown(sheet({ A1: "1", B1: "=A1+1" }), pick([0, 0], [1, 2]));

    expect(next.cells).toMatchObject({ A2: "1", A3: "1", B2: "=A2+1", B3: "=A3+1" });
  });

  it("clears a range and leaves the rest", () => {
    expect(clearCells(sheet({ A1: "1", A2: "2", A3: "3" }), pick([0, 0], [0, 1])).cells).toEqual({ A3: "3" });
  });

  it("puts results on the clipboard", () => {
    const data = sheet({ A1: "2", B1: "=A1*2" });

    expect(toTsv(computeSheet(data.cells), data, pick([0, 0], [1, 0]))).toBe("2\t4");
  });
});

describe("csv", () => {
  it("reads quotes, commas and new lines", () => {
    expect(parseCsv('a,"b,c"\r\n"d ""q""","e\nf"\n')).toEqual([["a", "b,c"], ['d "q"', "e\nf"]]);
  });

  it("round-trips computed values", () => {
    const data = sheet({ A1: "name", B1: "total", A2: "a,b", B2: "=1+1" });
    const csv = toCsv(computeSheet(data.cells), data);

    expect(csv).toBe('name,total\r\n"a,b",2');
    expect(sheetFromCsv(csv).cells).toEqual({ A1: "name", B1: "total", A2: "a,b", B2: "2" });
  });

  it("will not run a formula from a csv", () => {
    const { cells } = sheetFromCsv('=HYPERLINK("http://evil"),@SUM(1),+1+1,-5\n');

    expect(cells.A1.startsWith("'=")).toBe(true);
    expect(cells.B1.startsWith("'@")).toBe(true);
    expect(cells.C1.startsWith("'+")).toBe(true);
    expect(cells.D1).toBe("-5");
    expect(computeSheet(cells).get("A1")).toBe(cells.A1);
  });

  it("guards text that a spreadsheet would run when opening the export", () => {
    const data = sheet({ A1: '=CONCAT("=","1+1")' });

    expect(toCsv(computeSheet(data.cells), data)).toBe("'=1+1");
  });
});

describe("sheet files", () => {
  it("round-trips", () => {
    const data: SheetData = { cells: { A1: "1", B2: "=A1" }, styles: { A1: { bold: true, align: "right", format: "euro" } } };

    expect(parseSheet(serializeSheet(data))).toEqual(data);
  });

  it("drops what does not belong", () => {
    const text = JSON.stringify({
      cells: { A1: "1", ZZ9: "x", A999: "y", B1: 5, constructor: "z" },
      styles: { A1: { bold: "yes", align: "top", format: "evil", color: "red" }, nope: { bold: true } },
    });

    expect(parseSheet(text)).toEqual({ cells: { A1: "1" }, styles: {} });
  });

  it("survives broken files", () => {
    expect(parseSheet("not json")).toEqual(emptySheet());
    expect(parseSheet(undefined)).toEqual(emptySheet());
    expect(parseSheet("null")).toEqual(emptySheet());
  });
});
