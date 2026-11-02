import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentSchema, FORBIDDEN_KEYS, MODALITIES, SEMANTIC_TYPES } from "@ciml/core";
import { validateCiml } from "@ciml/evm";

const read = (path: string): string => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const SOURCES = [
  "packages/core/src/validate.ts",
  "packages/ciml/src/validate.ts",
  "packages/ciml/src/runtime.ts",
  "packages/iml/src/validate.ts",
  "packages/iml/src/runtime.ts",
];
const SPEC = ["spec/model.md", "spec/ciml.md", "spec/iml.md"].map(read).join("\n");

describe("generated files", () => {
  it("spec/schemas/document.schema.json matches the code", () => {
    const file = JSON.parse(read("spec/schemas/document.schema.json"));
    expect(file).toEqual(JSON.parse(JSON.stringify(documentSchema)));
  });
});

describe("the docs are accurate", () => {
  it("the README's example document is valid", () => {
    const block = /```json\n([\s\S]*?)```/.exec(read("README.md"))?.[1];
    expect(validateCiml(JSON.parse(block as string)).issues).toEqual([]);
  });
});

describe("the spec is complete", () => {
  it("documents every code the code can raise", () => {
    const codes = new Set(
      SOURCES.flatMap((path) => [...read(path).matchAll(/"((?:E|W)_[A-Z0-9_]+)"/g)].map((match) => match[1] as string)),
    );
    expect(codes.size).toBeGreaterThan(40);
    const missing = [...codes].filter((code) => !SPEC.includes(`\`${code}\``));
    expect(missing).toEqual([]);
  });
  it("lists every type, modality and forbidden key", () => {
    const model = read("spec/model.md");
    const words = [...SEMANTIC_TYPES, ...MODALITIES, ...FORBIDDEN_KEYS];
    expect(words.filter((word) => !model.includes(`\`${word}\``))).toEqual([]);
  });
});
