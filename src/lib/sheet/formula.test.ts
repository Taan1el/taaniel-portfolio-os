import { describe, expect, it } from "vitest";
import { FUNCTION_NAMES, SheetError, cellKey, columnName, evaluateFormula, formulaRefs, parseRef, shiftFormula, type CellValue } from "@/lib/sheet/formula";

const cells: Record<string, CellValue> = { A1: 1, A2: 2, A3: 3, B1: "x", B2: "y", C1: true, D1: null };
const run = (source: string) => evaluateFormula(source, (ref) => cells[cellKey(ref.column, ref.row)] ?? null);
const code = (source: string) => (run(source) as SheetError).code;

describe("the function list", () => {
  it("matches what the app says it offers", () => {
    expect(FUNCTION_NAMES).toHaveLength(28);
  });
});

describe("references", () => {
  it("names cells", () => {
    expect(columnName(25)).toBe("Z");
    expect(cellKey(1, 2)).toBe("B3");
    expect(parseRef("$b$3")).toEqual({ column: 1, row: 2 });
    expect(parseRef("A0")).toBeNull();
    expect(parseRef("A101")).toBeNull();
    expect(parseRef("AA1")).toBeNull();
  });
});

describe("arithmetic", () => {
  it.each([
    ["1+2*3", 7],
    ["(1+2)*3", 9],
    ["10-4-3", 3],
    ["2^3^2", 64],
    ["-2^2", 4],
    ["2*-3", -6],
    ["--5", 5],
    ["50%", 0.5],
    ["200*10%", 20],
    ["1.5e2", 150],
    [".5+.5", 1],
    ["7/2", 3.5],
    ["A1+A2*A3", 7],
    ["a1+$A$2", 3],
  ])("%s is %s", (source, expected) => {
    expect(run(source)).toBe(expected);
  });

  it("counts blanks as zero and booleans as one", () => {
    expect(run("D1+1")).toBe(1);
    expect(run("C1+1")).toBe(2);
    expect(run('"4"+1')).toBe(5);
  });
});

describe("text and comparison", () => {
  it("joins with &", () => {
    expect(run('"a"&"b"&1')).toBe("ab1");
    expect(run('"say ""hi"""')).toBe('say "hi"');
  });

  it.each([
    ["1=1", true],
    ["1<>1", false],
    ["2>=2", true],
    ["1<2", true],
    ['"a"="A"', true],
    ['"a"<"b"', true],
    ['1<"a"', true],
    ["D1=0", true],
    ['D1=""', true],
  ])("%s is %s", (source, expected) => {
    expect(run(source)).toBe(expected);
  });

  it("does comparison after addition", () => {
    expect(run("1+1=2")).toBe(true);
    expect(run('1&2=12')).toBe(false);
  });
});

describe("functions", () => {
  it.each([
    ["SUM(A1:A3)", 6],
    ["sum(A1:A3,10)", 16],
    ["SUM(B1:B2)", 0],
    ["AVERAGE(A1:A3)", 2],
    ["MIN(A1:A3)", 1],
    ["MAX(A1:A3,9)", 9],
    ["COUNT(A1:B3)", 3],
    ["COUNTA(A1:B3)", 5],
    ["ABS(-3)", 3],
    ["INT(-1.5)", -2],
    ["SQRT(16)", 4],
    ["ROUND(2.345,2)", 2.35],
    ["ROUND(1234,-2)", 1200],
    ["POWER(2,10)", 1024],
    ["MOD(7,3)", 1],
    ["MOD(-1,3)", 2],
    ["IF(A1=1,\"yes\",\"no\")", "yes"],
    ["IF(A1=2,\"yes\")", false],
    ["IFERROR(1/0,\"oops\")", "oops"],
    ["IFERROR(5,\"oops\")", 5],
    ["AND(TRUE,A1=1)", true],
    ["OR(FALSE,A1=2)", false],
    ["NOT(FALSE)", true],
    ['LEN("hello")', 5],
    ['UPPER("ab")', "AB"],
    ['LOWER("AB")', "ab"],
    ['TRIM("  a   b ")', "a b"],
    ['LEFT("hello",2)', "he"],
    ['RIGHT("hello",2)', "lo"],
    ['RIGHT("hello",0)', ""],
    ['MID("hello",2,3)', "ell"],
    ['CONCAT("a",1,B1:B2)', "a1xy"],
    ['COUNTIF(A1:A3,">1")', 2],
    ['COUNTIF(B1:B2,"x")', 1],
    ['SUMIF(A1:A3,">=2")', 5],
    ['SUMIF(B1:B2,"y",A1:A2)', 2],
  ])("%s", (source, expected) => {
    expect(run(source)).toBe(expected);
  });

  it("knows pi", () => {
    expect(run("PI()")).toBeCloseTo(Math.PI);
  });

  it("evaluates only the chosen IF branch", () => {
    expect(run("IF(TRUE,1,1/0)")).toBe(1);
    expect(run("IF(FALSE,1/0,2)")).toBe(2);
  });
});

describe("errors", () => {
  it.each([
    ["1/0", "#DIV/0!"],
    ["MOD(1,0)", "#DIV/0!"],
    ["AVERAGE(B1:B2)", "#DIV/0!"],
    ['"x"+1', "#VALUE!"],
    ["A1:A3+1", "#VALUE!"],
    ["NOPE(1)", "#NAME?"],
    ["nothing", "#NAME?"],
    ["1+", "#ERROR!"],
    ["(1", "#ERROR!"],
    ["1 2", "#ERROR!"],
    ['"open', "#ERROR!"],
    ["SUM(", "#ERROR!"],
    ["$", "#ERROR!"],
    ["A999", "#REF!"],
    ["SQRT(-1)", "#NUM!"],
    ["10^999", "#NUM!"],
  ])("%s gives %s", (source, expected) => {
    expect(code(source)).toBe(expected);
  });

  it("passes an error up through a formula", () => {
    expect(code("1+(1/0)")).toBe("#DIV/0!");
    expect(code("SUM(1,1/0)")).toBe("#DIV/0!");
  });

  it("does not mistake a name on the prototype for a function", () => {
    expect(code("constructor(1)")).toBe("#NAME?");
    expect(code("__proto__(1)")).toBe("#NAME?");
    expect(code("toString()")).toBe("#NAME?");
  });

  it("refuses absurd formulas without blowing the stack", () => {
    expect(code(`${"(".repeat(500)}1${")".repeat(500)}`)).toBe("#ERROR!");
    expect(code(`1${"+1".repeat(2000)}`)).toBe("#ERROR!");
  });

  it("cannot reach anything outside the language", () => {
    expect(code('alert("x")')).toBe("#NAME?");
    expect(code("window.location")).toBe("#NAME?");
    expect(code("process.exit(1)")).toBe("#NAME?");
  });
});

describe("what a formula reads", () => {
  it("lists references and ranges", () => {
    expect(formulaRefs("A1+SUM(B1:B2)").map((ref) => cellKey(ref.column, ref.row))).toEqual(["A1", "B1", "B2"]);
    expect(formulaRefs("1+")).toEqual([]);
  });
});

describe("shifting a copied formula", () => {
  it.each([
    ["A1+B2", 1, 1, "B2+C3"],
    ["$A1+A$1+$A$1", 1, 1, "$A2+B$1+$A$1"],
    ["SUM(A1:A3)", 0, 2, "SUM(A3:A5)"],
    ['"A1"&A1', 1, 0, '"A1"&B1'],
    ["ROUND(A1,2)", 1, 0, "ROUND(B1,2)"],
    ["A1", -1, 0, "#REF!"],
    ["A1", 0, -1, "#REF!"],
    ["Z100", 1, 0, "#REF!"],
  ])("%s by %i,%i is %s", (source, columns, rows, expected) => {
    expect(shiftFormula(source, columns, rows)).toBe(expected);
  });

  it("leaves names alone", () => {
    expect(shiftFormula("LOG10(A1)", 1, 0)).toBe("LOG10(B1)");
  });
});
