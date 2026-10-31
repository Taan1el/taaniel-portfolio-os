import { describe, expect, it } from "vitest";
import { itemsToJson, jsonToItems } from "@/lib/terminal-json";
import { createObject, getProperty, isShellObject, propertyNames } from "@/lib/terminal-objects";

const person = createObject("Test.Person", { Name: "Ada", Age: 36, Admin: true, Nickname: null }, "Ada");

describe("itemsToJson", () => {
  it("writes one object as an object with two-space indentation", () => {
    expect(itemsToJson([person], { depth: 2, compress: false })).toBe(
      '{\n  "Name": "Ada",\n  "Age": 36,\n  "Admin": true,\n  "Nickname": null\n}'
    );
  });

  it("writes several items as an array and -Compress on one line", () => {
    expect(itemsToJson([1, 2, 3], { depth: 2, compress: true })).toBe("[1,2,3]");
    expect(itemsToJson(["only"], { depth: 2, compress: true })).toBe('"only"');
  });

  it("keeps a single item an array with -AsArray", () => {
    expect(itemsToJson(["only"], { depth: 2, compress: true, asArray: true })).toBe('["only"]');
  });

  it("writes dates as ISO 8601 text", () => {
    const stamped = createObject("Test.Stamped", { When: { kind: "date", time: Date.UTC(2026, 0, 2, 3, 4, 5) } }, "stamped");
    expect(JSON.parse(itemsToJson([stamped], { depth: 2, compress: true }))).toEqual({ When: "2026-01-02T03:04:05.000Z" });
  });

  it("stops following nested objects at the depth limit and writes their text", () => {
    const leaf = createObject("Test.Leaf", { Deep: 1 }, "LEAF");
    const middle = createObject("Test.Middle", { Leaf: leaf }, "MIDDLE");
    const top = createObject("Test.Top", { Middle: middle }, "TOP");
    expect(JSON.parse(itemsToJson([top], { depth: 1, compress: true }))).toEqual({ Middle: { Leaf: "LEAF" } });
    expect(JSON.parse(itemsToJson([top], { depth: 5, compress: true }))).toEqual({ Middle: { Leaf: { Deep: 1 } } });
  });

  it("escapes characters a terminal would act on", () => {
    const json = itemsToJson(["a\x1b[2Jb\u009bc"], { depth: 2, compress: true });
    expect(json).not.toMatch(/[\x00-\x1f\x7f-\x9f]/);
    expect(JSON.parse(json)).toBe("a\x1b[2Jb\u009bc");
  });

  it("writes non-finite numbers as null", () => {
    expect(itemsToJson([Number.POSITIVE_INFINITY], { depth: 2, compress: true })).toBe("null");
  });
});

describe("jsonToItems", () => {
  it("turns an object into a pipeline object with its properties", () => {
    const result = jsonToItems('{"name": "Ada", "age": 36, "admin": true}');
    expect("items" in result).toBe(true);
    if (!("items" in result)) return;
    const [item] = result.items;
    expect(isShellObject(item)).toBe(true);
    if (!isShellObject(item)) return;
    expect(propertyNames(item)).toEqual(["name", "age", "admin"]);
    expect(getProperty(item, "AGE")).toBe(36);
    expect(item.text).toBe("@{name=Ada; age=36; admin=True}");
  });

  it("enumerates a top-level array", () => {
    const result = jsonToItems('[{"id": 1}, {"id": 2}, 3]');
    if (!("items" in result)) throw new Error("expected items");
    expect(result.items).toHaveLength(3);
    expect(result.items[2]).toBe(3);
  });

  it("keeps nested objects as objects and arrays as text", () => {
    const result = jsonToItems('{"tags": ["a", "b"], "owner": {"login": "Taan1el"}}');
    if (!("items" in result)) throw new Error("expected items");
    const [item] = result.items;
    if (!isShellObject(item)) throw new Error("expected an object");
    expect(getProperty(item, "tags")).toBe("{a, b}");
    const owner = getProperty(item, "owner");
    expect(isShellObject(owner) && getProperty(owner, "login")).toBe("Taan1el");
  });

  it("reports invalid JSON the way ConvertFrom-Json does", () => {
    const result = jsonToItems("{nope");
    expect("error" in result && result.error).toMatch(/^Conversion from JSON failed with error: /);
  });

  it("keeps a __proto__ key an ordinary property", () => {
    const result = jsonToItems('{"__proto__": {"polluted": 1}, "x": 2}');
    if (!("items" in result)) throw new Error("expected items");
    const [item] = result.items;
    if (!isShellObject(item)) throw new Error("expected an object");
    expect(propertyNames(item)).toEqual(["__proto__", "x"]);
    expect(({} as { polluted?: number }).polluted).toBeUndefined();
  });

  it("strips control characters from names and values", () => {
    const result = jsonToItems('{"a\\u001b[2Jb": "c\\u001b]0;pwned\\u0007d"}');
    if (!("items" in result)) throw new Error("expected items");
    const [item] = result.items;
    if (!isShellObject(item)) throw new Error("expected an object");
    expect(propertyNames(item)).toEqual(["a[2Jb"]);
    expect(getProperty(item, "a[2Jb")).toBe("c]0;pwnedd");
  });

  it("stops copying past a fixed number of nodes", () => {
    const result = jsonToItems(JSON.stringify(Array.from({ length: 50_000 }, (_, index) => ({ id: index }))));
    if (!("items" in result)) throw new Error("expected items");
    expect(result.items.length).toBeLessThan(10_001);
  });

  it("refuses text past the size limit without parsing it", () => {
    const result = jsonToItems(`"${"a".repeat(1_100_000)}"`);
    expect("error" in result && result.error).toMatch(/too large/);
  });

  it("shows JSON nested deeper than it follows as an ellipsis, without overflowing the stack", () => {
    const deep = `${"[".repeat(500)}1${"]".repeat(500)}`;
    const result = jsonToItems(`{"deep": ${deep}}`);
    expect("items" in result).toBe(true);
  });
});
