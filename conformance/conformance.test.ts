import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canonicalize, type ValidationResult, validateDocument } from "@ciml/core";
import { validateCiml } from "@ciml/evm";
import { validateIml } from "@ciml/openapi";

const root = new URL("./vectors/", import.meta.url);
const read = (path: string): any => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const names = (directory: string): string[] => readdirSync(new URL(directory, root)).sort();

function validate(document: any): ValidationResult {
  if (document?.schema === "ciml/2") return validateCiml(document);
  if (document?.schema === "iml/1") return validateIml(document);
  return validateDocument(document);
}

describe("valid vectors", () => {
  it.each(names("valid/"))("%s passes", (name) => {
    expect(validate(read(`valid/${name}`).document).issues).toEqual([]);
  });
});

describe("invalid vectors", () => {
  it.each(names("invalid/"))("%s reports its codes", (name) => {
    const vector = read(`invalid/${name}`);
    const result = validate(vector.document);
    expect(result.ok).toBe(false);
    const codes = new Set(result.issues.map((issue) => issue.code));
    for (const code of vector.expect) expect([...codes]).toContain(code);
  });

  it("covers every issue code the validators can raise", () => {
    const seen = new Set(names("invalid/").flatMap((name) => read(`invalid/${name}`).expect));
    // Raised only by remote fetching or by shapes covered in package tests.
    const elsewhere = new Set(["E_OPENAPI_DIGEST", "E_HTTP"]);
    const sources = ["core/src/validate.ts", "ciml/src/validate.ts", "iml/src/validate.ts"];
    const raised = sources.flatMap((source) => {
      const text = readFileSync(new URL(`../packages/${source}`, import.meta.url), "utf8");
      return [...text.matchAll(/"(E_[A-Z0-9_]+)"/g)].map((match) => match[1] as string);
    });
    const missing = [...new Set(raised)].filter((code) => !seen.has(code) && !elsewhere.has(code));
    expect(missing).toEqual([]);
  });
});

describe("canonical vectors", () => {
  it.each(read("canonical.json").cases as { name: string; input: string; expected: string }[])(
    "$name",
    ({ input, expected }) => {
      expect(canonicalize(JSON.parse(input))).toBe(expected);
    },
  );
});
