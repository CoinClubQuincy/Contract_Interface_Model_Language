import { getAddress, isAddress } from "viem";
import {
  type ActionBinding,
  type DataBinding,
  type EvmBinding,
  type InputSource,
  type InterfaceDocument,
  type Issue,
  mergeResults,
  type ValidationResult,
  validateDocument,
} from "@ciml/core";
import { coerceArgument, compatibleInputTypes, findFunction, inputName, isReadOnly } from "./abi.js";

function checkChecksum(address: string, path: string, issues: Issue[]): void {
  if (!isAddress(address, { strict: false }) || getAddress(address) !== address) {
    issues.push({
      code: "E_CHECKSUM",
      path,
      message: "addresses must carry an EIP-55 checksum, which catches typos",
    });
  }
}

function checkSource(
  parameterName: string,
  parameter: { type: string },
  source: InputSource,
  path: string,
  document: InterfaceDocument,
  issues: Issue[],
): void {
  if ("field" in source) {
    const field = document.objects[source.field]?.field;
    if (field && !compatibleInputTypes(parameter.type).includes(field.inputType)) {
      issues.push({
        code: "E_ABI_TYPE",
        path,
        message: `a ${field.inputType} field cannot supply ${parameter.type} ${parameterName}`,
      });
    }
    return;
  }
  if ("context" in source) {
    const expected = source.context === "wallet.address" ? /^address$/ : /^u?int\d*$/;
    if (!expected.test(parameter.type)) {
      issues.push({
        code: "E_ABI_TYPE",
        path,
        message: `${source.context} cannot supply ${parameter.type} ${parameterName}`,
      });
    }
    return;
  }
  if (parameter.type === "address" && typeof source.literal === "string") {
    checkChecksum(source.literal, path, issues);
  }
  try {
    coerceArgument(parameter as never, source.literal, parameterName);
  } catch (error) {
    issues.push({ code: "E_ABI_TYPE", path, message: (error as Error).message });
  }
}

function checkCall(
  call: DataBinding | ActionBinding,
  binding: EvmBinding,
  path: string,
  wantsEffect: "read" | "write",
  document: InterfaceDocument,
  issues: Issue[],
): void {
  const lookup = findFunction(binding.abi, call.operation);
  if (lookup.kind === "missing") {
    issues.push({
      code: "E_ABI_FUNCTION",
      path: `${path}/operation`,
      message: `the ABI has no function "${call.operation}"`,
    });
    return;
  }
  if (lookup.kind === "overloaded") {
    issues.push({
      code: "E_ABI_OVERLOAD",
      path: `${path}/operation`,
      message: `"${call.operation}" is overloaded: use one of ${lookup.signatures.join(", ")}`,
    });
    return;
  }
  const { item } = lookup;
  const readOnly = isReadOnly(item);
  if ((wantsEffect === "read") !== readOnly) {
    issues.push({
      code: "E_ABI_EFFECT",
      path,
      message: `${item.name} is ${item.stateMutability}, which does not match effect "${wantsEffect}"`,
    });
  }
  const value = (call as ActionBinding).value;
  if (value && item.stateMutability !== "payable") {
    issues.push({
      code: "E_ABI_VALUE",
      path: `${path}/value`,
      message: `${item.name} is not payable, so it cannot receive native coin`,
    });
  }
  const parameters = item.inputs ?? [];
  const names = parameters.map(inputName);
  const inputs = call.inputs ?? {};
  parameters.forEach((parameter, index) => {
    const name = names[index] ?? "";
    const source = inputs[name];
    if (!source) {
      issues.push({
        code: "E_ABI_INPUT_MISSING",
        path: `${path}/inputs`,
        message: `input "${name}" of ${item.name} has no source`,
      });
    } else {
      checkSource(name, parameter, source, `${path}/inputs/${name}`, document, issues);
    }
  });
  for (const name of Object.keys(inputs)) {
    if (!names.includes(name)) {
      issues.push({
        code: "E_ABI_INPUT_UNKNOWN",
        path: `${path}/inputs/${name}`,
        message: `${item.name} has no input "${name}"`,
      });
    }
  }
}

function checkEvm(document: InterfaceDocument): ValidationResult {
  const issues: Issue[] = [];
  const evm = (name: string): EvmBinding | undefined => {
    const binding = document.bindings[name];
    return binding?.kind === "evm" ? binding : undefined;
  };
  for (const [name, binding] of Object.entries(document.bindings)) {
    if (binding.kind !== "evm") {
      issues.push({
        code: "E_SCHEMA_KIND",
        path: `/bindings/${name}`,
        message: `a ciml/2 document binds to contracts, not "${binding.kind}"`,
      });
    } else {
      checkChecksum(binding.address, `/bindings/${name}/address`, issues);
    }
  }
  for (const [id, data] of Object.entries(document.data ?? {})) {
    const binding = evm(data.binding);
    if (binding) checkCall(data, binding, `/data/${id}`, "read", document, issues);
  }
  for (const [id, object] of Object.entries(document.objects)) {
    const binding = object.action && evm(object.action.binding);
    if (object.action && binding) {
      checkCall(object.action, binding, `/objects/${id}/action`, object.action.effect, document, issues);
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Validate a CIML document, including every call against the ABI it names. */
export function validateCiml(input: unknown): ValidationResult {
  const base = validateDocument(input);
  if (typeof input !== "object" || input === null || Array.isArray(input)) return base;
  const { schema, bindings, objects } = input as Partial<InterfaceDocument>;
  if (schema !== "ciml/2") {
    return mergeResults(base, {
      ok: false,
      issues: [{ code: "E_SCHEMA_KIND", path: "/schema", message: 'expected schema "ciml/2"' }],
    });
  }
  // Binding checks need well-formed content, so they wait until the shape is known to be good.
  if (base.issues.some((issue) => issue.code === "E_SCHEMA") || !bindings || !objects) return base;
  return mergeResults(base, checkEvm(input as InterfaceDocument));
}
