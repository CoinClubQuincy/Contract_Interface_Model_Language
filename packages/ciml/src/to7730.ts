import { InterfaceError, type InterfaceDocument } from "@ciml/core";
import { findFunction, inputName } from "./abi.js";

/** The ERC-7730 schema this exporter targets. ERC-7730 is a draft, so the target is pinned. */
export const ERC7730_SCHEMA = "https://eips.ethereum.org/assets/eip-7730/erc7730-v2.schema.json";

export interface To7730Options {
  /** Which binding to export. Optional when the document has one. */
  binding?: string;
  /** The entity responsible for the contract, shown to wallet users. Defaults to the title. */
  owner?: string;
}

function namedSignature(name: string, inputs: readonly { type: string }[], names: string[]): string {
  const parts = inputs.map((input, index) => `${input.type} ${names[index]}`);
  return `${name}(${parts.join(",")})`;
}

/**
 * Export a document's write actions as an ERC-7730 clear-signing descriptor, so hardware and
 * software wallets can show the same plain-language intent as the interface does.
 */
export function to7730(document: InterfaceDocument, options: To7730Options = {}): Record<string, unknown> {
  const names = Object.keys(document.bindings);
  const name = options.binding ?? (names.length === 1 ? names[0] : undefined);
  if (!name) throw new InterfaceError("E_UNKNOWN_BINDING", "choose a binding to export");
  const binding = document.bindings[name];
  if (binding?.kind !== "evm") {
    throw new InterfaceError("E_UNKNOWN_BINDING", `"${name}" is not a contract binding`);
  }

  const formats: Record<string, unknown> = {};
  for (const object of Object.values(document.objects)) {
    const { action } = object;
    if (!action || action.binding !== name || action.effect !== "write") continue;
    const lookup = findFunction(binding.abi, action.operation);
    if (lookup.kind !== "found") continue;
    const parameters = lookup.item.inputs ?? [];
    const parameterNames = parameters.map(inputName);
    const fields = parameters.map((parameter, index) => {
      const path = parameterNames[index] ?? "";
      const source = action.inputs?.[path];
      const field = source && "field" in source ? document.objects[source.field]?.field : undefined;
      const label =
        field?.label ??
        (source && "field" in source ? document.objects[source.field]?.accessibility.label : undefined) ??
        path;
      if (parameter.type === "address") return { path, label, format: "addressName" };
      if (field?.format === "date") {
        return { path, label, format: "date", params: { encoding: "timestamp" } };
      }
      if (field?.format === "tokenAmount") {
        return { path, label, format: "tokenAmount", params: { tokenPath: "@.to" } };
      }
      return { path, label, format: "raw" };
    });
    formats[namedSignature(lookup.item.name, parameters, parameterNames)] = {
      intent: action.confirm?.title ?? object.accessibility.label,
      fields,
    };
  }

  return {
    $schema: ERC7730_SCHEMA,
    context: {
      $id: document.title,
      contract: {
        deployments: [{ chainId: binding.chainId, address: binding.address }],
      },
    },
    metadata: {
      owner: options.owner ?? document.title,
      ...(document.homepage ? { info: { url: document.homepage } } : {}),
    },
    display: { formats },
  };
}
