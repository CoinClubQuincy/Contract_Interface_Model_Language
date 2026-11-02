import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

/**
 * RFC 8785 JSON Canonicalization Scheme. Object keys sort by UTF-16 code unit, which is JavaScript's
 * default string comparison, and numbers use ECMAScript serialization, which is JSON.stringify.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return serializeString(value);
    case "number":
      if (!Number.isFinite(value)) throw new TypeError("JSON has no NaN or Infinity");
      return JSON.stringify(value);
    case "object": {
      if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
      const record = value as Record<string, unknown>;
      const parts = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()
        .map((key) => `${serializeString(key)}:${canonicalize(record[key])}`);
      return `{${parts.join(",")}}`;
    }
    default:
      throw new TypeError(`cannot canonicalize a ${typeof value}`);
  }
}

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function serializeString(value: string): string {
  if (LONE_SURROGATE.test(value)) throw new TypeError("RFC 8785 rejects lone surrogates");
  return JSON.stringify(value);
}

/** The document's digest: sha256 of its canonical form, leaving out the integrity block. */
export function computeDigest(document: Record<string, unknown>): string {
  const { integrity: _integrity, ...content } = document;
  const bytes = new TextEncoder().encode(canonicalize(content));
  return `sha256:${bytesToHex(sha256(bytes))}`;
}

/** The exact text a signer signs. Binding the purpose stops it being reused as another message. */
export function signingMessage(digest: string): string {
  return `CIML document digest: ${digest}`;
}

/** Return a copy with a fresh digest. Any existing signatures are removed, as they no longer apply. */
export function withDigest<T extends object>(document: T): T {
  return {
    ...document,
    integrity: { digest: computeDigest(document as Record<string, unknown>) },
  };
}
