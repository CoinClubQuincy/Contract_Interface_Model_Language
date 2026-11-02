import {
  type AbiFunction,
  type AbiParameter,
  getAddress,
  isAddress,
  isHex,
  parseUnits,
  size,
  toFunctionSignature,
} from "viem";
import { type FieldSpec, InterfaceError } from "@ciml/core";

export type FunctionLookup =
  | { kind: "found"; item: AbiFunction; signature: string }
  | { kind: "missing" }
  | { kind: "overloaded"; signatures: string[] };

/** Functions are named by plain name, or by full signature when the name is overloaded. */
export function findFunction(abi: readonly unknown[], operation: string): FunctionLookup {
  const functions = abi.filter(
    (item): item is AbiFunction =>
      typeof item === "object" &&
      item !== null &&
      (item as { type?: unknown }).type === "function" &&
      typeof (item as { name?: unknown }).name === "string",
  );
  const signatureOf = (item: AbiFunction): string => {
    try {
      return toFunctionSignature({ ...item, inputs: item.inputs ?? [], outputs: item.outputs ?? [] });
    } catch {
      return `${item.name}(?)`;
    }
  };
  const matches = functions.filter((item) =>
    operation.includes("(") ? signatureOf(item) === operation : item.name === operation,
  );
  const [first] = matches;
  if (!first) return { kind: "missing" };
  if (matches.length > 1) return { kind: "overloaded", signatures: matches.map(signatureOf) };
  return { kind: "found", item: first, signature: signatureOf(first) };
}

/** Unnamed ABI parameters are addressed as arg0, arg1 and so on. */
export function inputName(parameter: AbiParameter, index: number): string {
  return parameter.name ? parameter.name : `arg${index}`;
}

export function isReadOnly(item: AbiFunction): boolean {
  return item.stateMutability === "view" || item.stateMutability === "pure";
}

/** Field input types that can produce a value of an ABI type. */
export function compatibleInputTypes(abiType: string): readonly string[] {
  if (abiType.endsWith("]") || abiType === "tuple") return ["text"];
  if (abiType === "address") return ["address", "select"];
  if (abiType === "bool") return ["boolean", "select"];
  if (/^u?int\d*$/.test(abiType)) return ["number", "amount", "date", "select"];
  if (abiType.startsWith("bytes")) return ["hex", "select"];
  return ["text", "email", "url", "date", "select", "address", "hex", "number"];
}

function fail(name: string, message: string): never {
  throw new InterfaceError("E_INPUT", `${name}: ${message}`);
}

function toInteger(name: string, abiType: string, raw: unknown, field?: FieldSpec): bigint {
  let value: bigint;
  try {
    if (typeof raw === "bigint") {
      value = raw;
    } else if (typeof raw === "number") {
      if (!Number.isSafeInteger(raw)) fail(name, "numbers this large must be written as strings");
      value = BigInt(raw);
    } else if (typeof raw === "string") {
      const text = raw.trim();
      if (field?.inputType === "amount") {
        if (!/^-?\d*\.?\d+$/.test(text)) fail(name, "not a number");
        const fraction = text.split(".")[1] ?? "";
        const decimals = field.decimals ?? 0;
        if (fraction.length > decimals) fail(name, `at most ${decimals} decimal places`);
        value = parseUnits(text, decimals);
      } else if (field?.inputType === "date" && !/^\d+$/.test(text)) {
        const time = Date.parse(text);
        if (Number.isNaN(time)) fail(name, "not a date");
        value = BigInt(Math.floor(time / 1000));
      } else {
        if (!/^-?\d+$/.test(text)) fail(name, "not a whole number");
        value = BigInt(text);
      }
    } else {
      return fail(name, "not a number");
    }
  } catch (error) {
    if (error instanceof InterfaceError) throw error;
    return fail(name, "not a number");
  }
  const match = /^(u?)int(\d*)$/.exec(abiType);
  const bits = BigInt(match?.[2] || "256");
  const min = match?.[1] ? 0n : -(1n << (bits - 1n));
  const max = match?.[1] ? (1n << bits) - 1n : (1n << (bits - 1n)) - 1n;
  if (value < min || value > max) fail(name, `out of range for ${abiType}`);
  return value;
}

/** Turn a user value or document literal into what the ABI encoder expects, or throw E_INPUT. */
export function coerceArgument(
  parameter: AbiParameter,
  raw: unknown,
  name: string,
  field?: FieldSpec,
): unknown {
  const { type } = parameter;
  const arrayMatch = /^(.*)\[(\d*)\]$/.exec(type);
  if (arrayMatch) {
    const items = parseStructured(raw, name);
    if (!Array.isArray(items)) fail(name, `expected a list for ${type}`);
    if (arrayMatch[2] && items.length !== Number(arrayMatch[2])) {
      fail(name, `expected ${arrayMatch[2]} items`);
    }
    const inner = { ...parameter, type: arrayMatch[1] ?? "" };
    return items.map((item, index) => coerceArgument(inner, item, `${name}[${index}]`));
  }
  if (type === "tuple") {
    const value = parseStructured(raw, name);
    const components = (parameter as { components?: readonly AbiParameter[] }).components ?? [];
    if (typeof value !== "object" || value === null) fail(name, "expected an object");
    return Object.fromEntries(
      components.map((component, index) => {
        const key = inputName(component, index);
        const item = Array.isArray(value) ? value[index] : (value as Record<string, unknown>)[key];
        if (item === undefined) fail(`${name}.${key}`, "missing");
        return [key, coerceArgument(component, item, `${name}.${key}`)];
      }),
    );
  }
  if (type === "address") {
    if (typeof raw !== "string" || !isAddress(raw, { strict: false })) fail(name, "not an address");
    if (raw !== raw.toLowerCase() && !isAddress(raw, { strict: true })) {
      fail(name, "the address has a bad checksum, which often means a typo");
    }
    return getAddress(raw);
  }
  if (type === "bool") {
    if (typeof raw === "boolean") return raw;
    if (raw === "true") return true;
    if (raw === "false") return false;
    return fail(name, "not true or false");
  }
  if (/^u?int\d*$/.test(type)) return toInteger(name, type, raw, field);
  if (type.startsWith("bytes")) {
    if (typeof raw !== "string" || !isHex(raw, { strict: true })) fail(name, "not hex");
    if (raw.length % 2 !== 0) fail(name, "hex must have an even length");
    const fixed = /^bytes(\d+)$/.exec(type)?.[1];
    if (fixed && size(raw) !== Number(fixed)) fail(name, `expected ${fixed} bytes`);
    return raw;
  }
  if (type === "string") {
    if (typeof raw !== "string") fail(name, "not text");
    return raw;
  }
  return fail(name, `unsupported type ${type}`);
}

function parseStructured(raw: unknown, name: string): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return fail(name, "expected JSON");
  }
}

/** Make a result safe for JSON pointers and display: bigints become decimal strings. */
export function normalizeValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]),
    );
  }
  return value;
}

/** One output is returned as itself. Several are addressable by index and by name. */
export function normalizeResult(item: AbiFunction, raw: unknown): unknown {
  const outputs = item.outputs ?? [];
  if (outputs.length <= 1 || !Array.isArray(raw)) return normalizeValue(raw);
  const result: Record<string, unknown> = {};
  raw.forEach((value, index) => {
    const normal = normalizeValue(value);
    result[String(index)] = normal;
    const name = outputs[index]?.name;
    if (name) result[name] = normal;
  });
  return result;
}
