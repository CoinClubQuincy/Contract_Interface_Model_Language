import { type AbiFunction, type AbiParameter, getAddress, toFunctionSignature } from "viem";
import type {
  FieldSpec,
  InputSource,
  InterfaceDocument,
  InterfaceObject,
  ValueSpec,
} from "@ciml/core";
import { inputName, isReadOnly } from "./abi.js";

export interface FromAbiOptions {
  abi: readonly Record<string, unknown>[];
  chainId: number;
  address: string;
  id: string;
  title: string;
  description?: string;
  version?: string;
  /** Treat parameters and results named like token amounts as having these decimals. */
  tokenDecimals?: number;
}

const AMOUNT_NAME = /^_?(amount|value|wad|balance|allowance|supply|totalSupply|balanceOf)$/i;

function slug(text: string): string {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[^a-z]+/, "");
  return cleaned.replace(/-+$/, "") || "item";
}

function humanize(name: string): string {
  const spaced = name.replace(/^_+/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function fieldFor(
  parameter: AbiParameter,
  name: string,
  fieldName: string,
  decimals: number | undefined,
): FieldSpec {
  const label = humanize(name);
  const { type } = parameter;
  if (type === "address") return { name: fieldName, inputType: "address", label, required: true, format: "addressName" };
  if (type === "bool") return { name: fieldName, inputType: "boolean", label };
  if (/^u?int\d*$/.test(type)) {
    if (decimals !== undefined && AMOUNT_NAME.test(name)) {
      return { name: fieldName, inputType: "amount", label, required: true, decimals, format: "tokenAmount" };
    }
    return { name: fieldName, inputType: "number", label, required: true };
  }
  if (type.startsWith("bytes") && !type.endsWith("]")) return { name: fieldName, inputType: "hex", label, required: true };
  if (type === "string") return { name: fieldName, inputType: "text", label, required: true };
  // Lists and tuples are entered as JSON and checked when the action is prepared.
  return { name: fieldName, inputType: "text", label, required: true, placeholder: `JSON for ${type}` };
}

function valueFor(item: AbiFunction, dataName: string, decimals: number | undefined): ValueSpec {
  const [output] = item.outputs ?? [];
  if ((item.outputs ?? []).length !== 1 || !output) return { data: dataName, format: "json" };
  if (output.type === "address") return { data: dataName, format: "address" };
  if (output.type === "bool") return { data: dataName, format: "boolean" };
  if (/^u?int\d*$/.test(output.type)) {
    if (decimals !== undefined && AMOUNT_NAME.test(item.name)) {
      return { data: dataName, format: "amount", decimals };
    }
    return { data: dataName, format: "number" };
  }
  if (output.type === "string") return { data: dataName, format: "text" };
  return { data: dataName, format: "json" };
}

/** Generate a working document from an ABI. A starting point: the result is safe, not polished. */
export function fromAbi(options: FromAbiOptions): InterfaceDocument {
  const binding = "contract";
  const functions = options.abi.filter((item) => item.type === "function") as unknown as AbiFunction[];
  const counts = new Map<string, number>();
  for (const item of functions) counts.set(item.name, (counts.get(item.name) ?? 0) + 1);

  const objects: Record<string, InterfaceObject> = {};
  const data: NonNullable<InterfaceDocument["data"]> = {};
  const used = new Set(["root", "overview", "reads", "writes"]);
  const uniqueId = (wanted: string): string => {
    let id = wanted;
    for (let n = 2; used.has(id); n += 1) id = `${wanted}-${n}`;
    used.add(id);
    return id;
  };

  const overview: string[] = [];
  const reads: string[] = [];
  const writes: string[] = [];

  for (const item of functions) {
    const overloaded = (counts.get(item.name) ?? 0) > 1;
    const inputs = item.inputs ?? [];
    const operation = overloaded
      ? toFunctionSignature({ ...item, inputs, outputs: item.outputs ?? [] })
      : item.name;
    const label = humanize(item.name);
    const base = uniqueId(slug(item.name));

    if (isReadOnly(item) && inputs.length === 0) {
      const dataName = `d_${base.replace(/[^a-zA-Z0-9]/g, "_")}`;
      data[dataName] = { binding, operation };
      objects[base] = {
        type: "metric",
        purpose: `Shows the result of ${item.name}`,
        accessibility: { label },
        value: valueFor(item, dataName, options.tokenDecimals),
      };
      overview.push(base);
      continue;
    }

    const children: string[] = [];
    const sources: Record<string, InputSource> = {};
    inputs.forEach((parameter, index) => {
      const name = inputName(parameter, index);
      const fieldId = uniqueId(`${base}.${slug(name)}`);
      objects[fieldId] = {
        type: "field",
        purpose: `The ${name} input of ${item.name}`,
        accessibility: { label: humanize(name) },
        field: fieldFor(parameter, name, fieldId, options.tokenDecimals),
      };
      children.push(fieldId);
      sources[name] = { field: fieldId };
    });

    const effect = isReadOnly(item) ? "read" : "write";
    const actionId = uniqueId(`${base}.submit`);
    let value: InputSource | undefined;
    if (item.stateMutability === "payable") {
      const valueId = uniqueId(`${base}.value`);
      objects[valueId] = {
        type: "field",
        purpose: `Native coin to send to ${item.name}`,
        accessibility: { label: "Amount of native coin to send" },
        field: { name: valueId, inputType: "amount", label: "Native coin to send", decimals: 18 },
      };
      children.push(valueId);
      value = { field: valueId };
    }
    objects[actionId] = {
      type: "action",
      purpose: effect === "read" ? `Runs ${item.name}` : `Sends a ${item.name} transaction`,
      accessibility: { label },
      action: {
        binding,
        operation,
        inputs: sources,
        effect,
        ...(value ? { value } : {}),
        ...(effect === "write" ? { confirm: { title: label } } : {}),
      },
    };
    children.push(actionId);
    objects[base] = {
      type: "form",
      purpose: `Inputs for ${item.name}`,
      accessibility: { label },
      children,
    };
    (effect === "read" ? reads : writes).push(base);
  }

  const groups: [string, string, string, string[]][] = [
    ["overview", "Overview", "Current values read from the contract", overview],
    ["reads", "Look up", "Queries that take inputs", reads],
    ["writes", "Actions", "Transactions that change on-chain state", writes],
  ];
  const rootChildren: string[] = [];
  for (const [id, label, purpose, children] of groups) {
    if (children.length === 0) continue;
    objects[id] = { type: "panel", purpose, accessibility: { label }, children };
    rootChildren.push(id);
  }
  objects.root = {
    type: "workspace",
    purpose: `An interface for ${options.title}`,
    accessibility: { label: options.title },
    children: rootChildren,
  };

  return {
    schema: "ciml/2",
    id: options.id,
    version: options.version ?? "1.0.0",
    title: options.title,
    ...(options.description ? { description: options.description } : {}),
    bindings: {
      [binding]: {
        kind: "evm",
        chainId: options.chainId,
        address: getAddress(options.address),
        abi: options.abi,
      },
    },
    data,
    root: "root",
    objects,
  };
}
