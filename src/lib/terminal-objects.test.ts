import { describe, expect, it } from "vitest";
import {
  compareValues,
  createObject,
  formatGenericView,
  formatListView,
  formatPropertyValue,
  formatTableView,
  getProperty,
  itemText,
  resolvePropertyNames,
  selectProperties,
  splitPropertyList,
} from "@/lib/terminal-objects";

const strip = (lines: string[]) => lines.map((line) => line.replace(/\x1b\[[0-9;]*m/g, ""));

const people = [
  createObject("Person", { Name: "Ada", Age: 36, Admin: true }, "Ada"),
  createObject("Person", { Name: "Linus", Age: 7, Admin: false }, "Linus"),
];

describe("shell objects", () => {
  it("looks properties up case-insensitively and gives strings a Length", () => {
    expect(getProperty(people[0], "name")).toBe("Ada");
    expect(getProperty(people[0], "NOPE")).toBeUndefined();
    expect(getProperty("hello", "length")).toBe(5);
  });

  it("prints values the way PowerShell does", () => {
    expect(formatPropertyValue(true)).toBe("True");
    expect(formatPropertyValue(null)).toBe("");
    expect(formatPropertyValue(1 / 3)).toBe("0.333333333333333");
    expect(itemText(people[1])).toBe("Linus");
  });

  it("never lets control characters through", () => {
    expect(formatPropertyValue("a\x1b[31mb\x07\x9bc")).toBe("a[31mbc");
    const table = formatTableView([createObject("X", { Note: "line\nbreak\ttab" }, "x")]);
    expect(strip(table)[3]).toBe("line break tab");
  });

  it("expands wildcard property names and removes duplicates", () => {
    expect(resolvePropertyNames(people, ["*"])).toEqual(["Name", "Age", "Admin"]);
    expect(resolvePropertyNames(people, ["a*"])).toEqual(["Age", "Admin"]);
    expect(resolvePropertyNames(people, ["name", "NAME", "age"])).toEqual(["Name", "Age"]);
  });

  it("splits comma separated property lists", () => {
    expect(splitPropertyList(["Name,Length", " Mode ", "A, B"])).toEqual(["Name", "Length", "Mode", "A", "B"]);
  });

  it("selects properties into new objects", () => {
    const [first] = selectProperties(people, ["name"]);
    expect(first.typeName).toBe("Selected.Person");
    expect(Object.keys(first.properties)).toEqual(["Name"]);
    expect(first.text).toBe("@{Name=Ada}");
  });
});

describe("ordering", () => {
  it("sorts numbers numerically, text case-insensitively and nulls first", () => {
    const sorted = [10, 9, null, 100].sort(compareValues);
    expect(sorted).toEqual([null, 9, 10, 100]);
    expect(compareValues("apple", "Banana")).toBeLessThan(0);
    expect(compareValues({ kind: "date", time: 5 }, { kind: "date", time: 9 })).toBeLessThan(0);
  });
});

describe("tables and lists", () => {
  it("draws a table with right-aligned numbers and an unpadded last column", () => {
    expect(strip(formatTableView(people))).toEqual([
      "",
      "Name  Age Admin",
      "----  --- -----",
      "Ada    36 True",
      "Linus   7 False",
      "",
    ]);
  });

  it("limits a table to the requested properties", () => {
    expect(strip(formatTableView(people, ["Age", "Name"]))).toEqual(["", "Age Name", "--- ----", " 36 Ada", "  7 Linus", ""]);
  });

  it("draws a list block per object", () => {
    expect(strip(formatListView(people, ["Name", "Age"]))).toEqual(["", "Name : Ada", "Age  : 36", "", "Name : Linus", "Age  : 7", ""]);
  });

  it("picks a table up to four properties and a list beyond", () => {
    expect(strip(formatGenericView(people))[1]).toBe("Name  Age Admin");
    const wide = [createObject("Wide", { A: 1, B: 2, C: 3, D: 4, E: 5 }, "w")];
    expect(strip(formatGenericView(wide))).toEqual(["", "A : 1", "B : 2", "C : 3", "D : 4", "E : 5", ""]);
  });

  it("clips very wide cells", () => {
    const long = createObject("L", { Text: "x".repeat(200) }, "l");
    const row = strip(formatTableView([long]))[3];
    expect(row.length).toBe(60);
    expect(row.endsWith("…")).toBe(true);
  });
});
