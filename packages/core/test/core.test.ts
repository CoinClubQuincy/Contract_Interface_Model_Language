import { describe, expect, it } from "vitest";
import {
  canonicalize,
  computeDigest,
  formatValue,
  isSafeTokenValue,
  isSafeUrl,
  readPointer,
  resolveInputs,
  signingMessage,
  validateDocument,
  withDigest,
} from "@ciml/core";

const minimal = (): any => ({
  schema: "ciml/2",
  id: "test.doc",
  version: "1.0.0",
  title: "Test",
  bindings: {
    c: { kind: "evm", chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", abi: [] },
  },
  root: "root",
  objects: { root: { type: "workspace", purpose: "Root", accessibility: { label: "Root" } } },
});

const codes = (input: unknown): string[] => validateDocument(input).issues.map((issue) => issue.code);

describe("canonicalize", () => {
  it("sorts keys and leaves out undefined", () => {
    expect(canonicalize({ b: 1, a: undefined, c: [{ z: 1, y: 2 }] })).toBe('{"b":1,"c":[{"y":2,"z":1}]}');
  });
  it("rejects what JSON cannot represent", () => {
    expect(() => canonicalize(Number.NaN)).toThrow();
    expect(() => canonicalize(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => canonicalize(() => 1)).toThrow();
    expect(() => canonicalize(1n)).toThrow();
  });
  it("rejects lone surrogates in values and in keys", () => {
    expect(() => canonicalize("\ud800")).toThrow(/surrogate/);
    expect(() => canonicalize({ "\udc00": 1 })).toThrow(/surrogate/);
    expect(canonicalize("😀")).toBe('"😀"');
  });
});

describe("digest", () => {
  it("does not depend on key order or on the integrity block", () => {
    const a = minimal();
    const b = { root: a.root, objects: a.objects, bindings: a.bindings, title: a.title, version: a.version, id: a.id, schema: a.schema };
    expect(computeDigest(a)).toBe(computeDigest(b));
    expect(computeDigest({ ...a, integrity: { digest: "anything" } })).toBe(computeDigest(a));
  });
  it("changes when any content changes", () => {
    const a = minimal();
    const b = minimal();
    b.objects.root.purpose = "Other";
    expect(computeDigest(a)).not.toBe(computeDigest(b));
  });
  it("is pinned to a known value, so accidental format changes are caught", () => {
    expect(computeDigest({ a: 1 })).toBe("sha256:015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862");
  });
  it("withDigest validates, and removes signatures that no longer apply", () => {
    const sealed = withDigest({ ...minimal(), integrity: { digest: "x", signatures: [{}] } });
    expect(sealed.integrity.signatures).toBeUndefined();
    expect(validateDocument(sealed).issues).toEqual([]);
  });
  it("binds the signed text to its purpose", () => {
    expect(signingMessage("sha256:ab")).toBe("CIML document digest: sha256:ab");
  });
});

describe("validateDocument", () => {
  it("accepts a minimal document", () => {
    expect(validateDocument(minimal()).issues).toEqual([]);
  });
  it.each([[null], [1], ["x"], [[]]])("rejects non-object %j", (input) => {
    expect(codes(input)).toEqual(["E_SCHEMA"]);
  });
  it("refuses __proto__ from parsed JSON", () => {
    const parsed = JSON.parse(
      JSON.stringify(minimal()).replace('"title":"Test"', '"title":"Test","__proto__":{"x":1}'),
    );
    expect(codes(parsed)).toContain("E_FORBIDDEN_KEY");
  });
  it("does not trip on object names that match Object.prototype", () => {
    const doc = minimal();
    doc.objects.root.children = ["constructor"];
    doc.objects.constructor = { type: "text", purpose: "x", accessibility: { label: "x" }, text: "x" };
    expect(validateDocument(doc).issues).toEqual([]);
    const missing = minimal();
    missing.root = "constructor";
    expect(codes(missing)).toContain("E_ROOT");
  });
  it("treats an inherited presentation key as unknown instead of crashing", () => {
    const doc = minimal();
    doc.objects.root.presentation = JSON.parse('{"constructor":"x","toString":"y"}');
    expect(codes(doc).filter((code) => code === "E_RAW_STYLE")).toHaveLength(2);
  });
  it("reports excess depth instead of overflowing the stack", () => {
    const doc = minimal();
    let deep: unknown = "x";
    for (let index = 0; index < 20_000; index += 1) deep = [deep];
    doc.objects.root.action = { binding: "c", operation: "x", effect: "read", inputs: { a: { literal: deep } } };
    expect(codes(doc)).toContain("E_SCHEMA");
  });
  it("needs an action or link on an action object, and a field block on a field", () => {
    const doc = minimal();
    doc.objects.root.children = ["a", "f"];
    doc.objects.a = { type: "action", purpose: "x", accessibility: { label: "x" } };
    doc.objects.f = { type: "field", purpose: "x", accessibility: { label: "x" } };
    expect(codes(doc).filter((code) => code === "E_OBJECT_SHAPE")).toHaveLength(2);
  });
  it("needs options on a select", () => {
    const doc = minimal();
    doc.objects.root.children = ["f"];
    doc.objects.f = { type: "field", purpose: "x", accessibility: { label: "x" }, field: { name: "f", inputType: "select" } };
    expect(codes(doc)).toContain("E_OBJECT_SHAPE");
  });
});

describe("token values", () => {
  it.each(["#fff", "12px", "1.5", "rgb(0 0 0 / 50%)", "calc((1px + 2px) * 3)", "color-mix(in srgb, red 50%, blue)", "ui-monospace, monospace", 12])("allows %s", (value) => {
    expect(isSafeTokenValue(value)).toBe(true);
  });
  it.each([
    "url(https://x)", "URL (x)", "image-set(x)", "-webkit-image-set(x)", "image(x)", "src(x)", "cross-fade(x)", "element(#a)",
    "paint(x)", "expression(alert(1))", "attr(x)", "var(--secret)", "calc(1px + url(x))",
    "red;background:red", "}", "{", "<b>", "@import", "\\75rl(x)", Number.NaN, null, "x".repeat(201),
  ])("refuses %s", (value) => {
    expect(isSafeTokenValue(value)).toBe(false);
  });
});

describe("isSafeUrl", () => {
  it.each(["https://a.example", "ipfs://bafy"])("allows %s", (url) => expect(isSafeUrl(url)).toBe(true));
  it.each(["http://a.example", "javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "//a.example", "", "JaVaScRiPt:alert(1)", " javascript:alert(1)"])(
    "refuses %s",
    (url) => expect(isSafeUrl(url)).toBe(false),
  );
});

describe("helpers", () => {
  it("reads JSON pointers, without reaching inherited properties", () => {
    const value = { a: { "b/c": [1, { d: 2 }] }, "m~n": 3 };
    expect(readPointer(value, "/a/b~1c/1/d")).toBe(2);
    expect(readPointer(value, "/m~0n")).toBe(3);
    expect(readPointer(value, undefined)).toBe(value);
    expect(readPointer(value, "/missing/x")).toBeUndefined();
    expect(readPointer(value, "/constructor")).toBeUndefined();
    expect(readPointer(value, "/__proto__")).toBeUndefined();
  });
  it("resolves inputs and lists what is missing", () => {
    const { values, missing } = resolveInputs(
      { a: { field: "f1" }, b: { field: "f2" }, c: { context: "wallet.address" }, d: { context: "nope" }, e: { literal: 0 } },
      { f1: "x", f2: "" },
      { "wallet.address": "0x1" },
    );
    expect(values).toEqual({ a: "x", c: "0x1", e: 0 });
    expect(missing).toEqual(["b", "d"]);
  });
  it("keeps false as a value", () => {
    expect(resolveInputs({ a: { field: "f" } }, { f: false }, {}).values).toEqual({ a: false });
  });
  it.each([
    ["1500000", { format: "amount", decimals: 6 }, "1.5"],
    ["1", { format: "amount", decimals: 18 }, "0.000000000000000001"],
    ["-1500000", { format: "amount", decimals: 6 }, "-1.5"],
    ["115792089237316195423570985008687907853269984665640564039457584007913129639935", { format: "amount", decimals: 18 }, "115792089237316195423570985008687907853269984665640564039457.584007913129639935"],
    ["100", { format: "amount", decimals: 0 }, "100"],
    ["not-a-number", { format: "amount", decimals: 2 }, "not-a-number"],
    [true, { format: "boolean" }, "true"],
    [0, { format: "text" }, "0"],
    [1700000000, { format: "date" }, "2023-11-14"],
    [1700000000, { format: "datetime" }, "2023-11-14T22:13:20.000Z"],
    ["2024-01-02", { format: "date" }, "2024-01-02"],
    ["soon", { format: "date" }, "soon"],
    [12, { format: "percent" }, "12%"],
    [{ a: 1 }, { format: "json" }, '{"a":1}'],
    [null, {}, ""],
    [undefined, {}, ""],
  ] as const)("formats %j with %j", (value, spec, expected) => {
    expect(formatValue(value, spec as never)).toBe(expected);
  });
});
