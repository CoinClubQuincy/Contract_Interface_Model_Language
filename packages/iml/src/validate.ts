import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import {
  type ActionBinding,
  canonicalize,
  type DataBinding,
  type InputSource,
  type InterfaceDocument,
  InterfaceError,
  type Issue,
  mergeResults,
  type OpenApiBinding,
  type ValidationResult,
  validateDocument,
} from "@ciml/core";
import {
  bodyProperties,
  FORBIDDEN_HEADERS,
  isReadMethod,
  isSafeServer,
  listOperations,
  requiredBodyProperties,
  type SpecOperation,
  type SpecRecord,
  specServers,
} from "./spec.js";

const NUMERIC_FIELDS = ["number", "amount", "select"];

function checkInputType(
  schema: SpecRecord | undefined,
  source: InputSource,
  name: string,
  path: string,
  document: InterfaceDocument,
  issues: Issue[],
): void {
  if (!schema || !("field" in source)) return;
  const field = document.objects[source.field]?.field;
  if (!field) return;
  const numeric = schema.type === "integer" || schema.type === "number";
  if (numeric && !NUMERIC_FIELDS.includes(field.inputType)) {
    issues.push({
      code: "E_OPENAPI_INPUT",
      path,
      message: `a ${field.inputType} field cannot supply the ${String(schema.type)} input "${name}"`,
    });
  }
}

function checkCall(
  call: DataBinding | ActionBinding,
  spec: SpecRecord,
  operations: SpecOperation[],
  path: string,
  wantsEffect: "read" | "write",
  document: InterfaceDocument,
  issues: Issue[],
): void {
  const matches = operations.filter((item) => item.operationId === call.operation);
  const [operation] = matches;
  if (!operation || matches.length > 1) {
    issues.push({
      code: "E_OPENAPI_OPERATION",
      path: `${path}/operation`,
      message: operation
        ? `operationId "${call.operation}" is used more than once in the spec`
        : `the spec has no operation "${call.operation}"`,
    });
    return;
  }
  // GET and HEAD are safe by definition. Anything else counts as a write, whatever a document says.
  const actual = isReadMethod(operation.method) ? "read" : "write";
  if (actual !== wantsEffect) {
    issues.push({
      code: "E_OPENAPI_EFFECT",
      path,
      message: `${operation.method} ${operation.path} is a ${actual}, not a ${wantsEffect}`,
    });
  }
  const inputs = call.inputs ?? {};
  const properties = bodyProperties(spec, operation);
  const parameters = new Map(operation.parameters.map((item) => [item.name, item]));
  for (const parameter of operation.parameters) {
    if (parameter.in === "cookie") continue;
    if (parameter.required && !inputs[parameter.name]) {
      issues.push({
        code: "E_OPENAPI_INPUT",
        path: `${path}/inputs`,
        message: `required parameter "${parameter.name}" has no source`,
      });
    }
  }
  if (operation.body?.required && !inputs.body) {
    for (const name of requiredBodyProperties(operation)) {
      if (!inputs[name]) {
        issues.push({
          code: "E_OPENAPI_INPUT",
          path: `${path}/inputs`,
          message: `required body property "${name}" has no source`,
        });
      }
    }
    if (Object.keys(properties).length === 0) {
      issues.push({ code: "E_OPENAPI_INPUT", path: `${path}/inputs`, message: 'the request body needs a "body" input' });
    }
  }
  for (const [name, source] of Object.entries(inputs)) {
    const inputPath = `${path}/inputs/${name}`;
    const parameter = parameters.get(name);
    if (parameter?.in === "cookie") {
      issues.push({ code: "E_OPENAPI_INPUT", path: inputPath, message: "documents cannot set cookies" });
    } else if (parameter?.in === "header" && FORBIDDEN_HEADERS.has(name.toLowerCase())) {
      issues.push({ code: "E_OPENAPI_INPUT", path: inputPath, message: `documents cannot set the ${name} header` });
    } else if (parameter) {
      checkInputType(parameter.schema, source, name, inputPath, document, issues);
    } else if (name === "body" && operation.body) {
      continue;
    } else if (Object.prototype.hasOwnProperty.call(properties, name)) {
      checkInputType(properties[name], source, name, inputPath, document, issues);
    } else {
      issues.push({
        code: "E_OPENAPI_INPUT",
        path: inputPath,
        message: `${call.operation} has no input "${name}"`,
      });
    }
  }
  if ((call as ActionBinding).value) {
    issues.push({
      code: "E_OPENAPI_INPUT",
      path: `${path}/value`,
      message: "API calls have no native coin value",
    });
  }
}

function checkBindings(
  document: InterfaceDocument,
  external: Record<string, SpecRecord>,
): ValidationResult {
  const issues: Issue[] = [];
  const specs = new Map<string, { spec: SpecRecord; operations: SpecOperation[] }>();
  for (const [name, binding] of Object.entries(document.bindings)) {
    const path = `/bindings/${name}`;
    if (binding.kind !== "openapi") {
      issues.push({
        code: "E_SCHEMA_KIND",
        path,
        message: `an iml/1 document binds to APIs, not "${binding.kind}"`,
      });
      continue;
    }
    if (!isSafeServer(binding.server)) {
      issues.push({
        code: "E_SERVER_URL",
        path: `${path}/server`,
        message: "servers must be https, with no credentials, query or fragment",
      });
    }
    const spec = "inline" in binding.spec ? (binding.spec.inline as SpecRecord) : external[name];
    if (!spec) {
      if ("url" in binding.spec && !binding.spec.url.startsWith("https://")) {
        issues.push({ code: "E_URL_SCHEME", path: `${path}/spec/url`, message: "spec links must use https" });
      }
      continue; // Remote specs are checked by validateImlWithSpecs.
    }
    if (typeof spec.openapi !== "string" || !spec.openapi.startsWith("3.")) {
      issues.push({ code: "E_OPENAPI_SPEC", path: `${path}/spec`, message: "expected an OpenAPI 3.x document" });
      continue;
    }
    const servers = specServers(spec);
    if (servers.length > 0 && !servers.includes(binding.server.replace(/\/+$/, ""))) {
      issues.push({
        code: "E_SERVER_URL",
        path: `${path}/server`,
        message: `the spec does not list this server. It lists ${servers.join(", ")}`,
      });
    }
    specs.set(name, { spec, operations: listOperations(spec) });
  }
  const check = (call: DataBinding | ActionBinding, path: string, effect: "read" | "write"): void => {
    const entry = specs.get(call.binding);
    if (entry) checkCall(call, entry.spec, entry.operations, path, effect, document, issues);
  };
  for (const [id, data] of Object.entries(document.data ?? {})) check(data, `/data/${id}`, "read");
  for (const [id, object] of Object.entries(document.objects)) {
    if (object.action) check(object.action, `/objects/${id}/action`, object.action.effect);
  }
  return { ok: issues.length === 0, issues };
}

/** Validate an IML document against the OpenAPI specs it carries inline. */
export function validateIml(input: unknown, external: Record<string, SpecRecord> = {}): ValidationResult {
  const base = validateDocument(input);
  if (typeof input !== "object" || input === null || Array.isArray(input)) return base;
  const { schema, bindings, objects } = input as Partial<InterfaceDocument>;
  if (schema !== "iml/1") {
    return mergeResults(base, {
      ok: false,
      issues: [{ code: "E_SCHEMA_KIND", path: "/schema", message: 'expected schema "iml/1"' }],
    });
  }
  if (base.issues.some((issue) => issue.code === "E_SCHEMA") || !bindings || !objects) return base;
  return mergeResults(base, checkBindings(input as InterfaceDocument, external));
}

export function specDigest(spec: unknown): string {
  return `sha256:${bytesToHex(sha256(new TextEncoder().encode(canonicalize(spec))))}`;
}

/** Fetch a remote spec and check it against the digest the document pins. */
export async function loadSpec(binding: OpenApiBinding, fetcher: typeof fetch = fetch): Promise<SpecRecord> {
  if ("inline" in binding.spec) return binding.spec.inline as SpecRecord;
  if (!binding.spec.url.startsWith("https://")) {
    throw new InterfaceError("E_URL_SCHEME", "spec links must use https");
  }
  const response = await fetcher(binding.spec.url, { redirect: "error", credentials: "omit" });
  if (!response.ok) throw new InterfaceError("E_HTTP", `the spec returned HTTP ${response.status}`);
  const spec = (await response.json()) as SpecRecord;
  if (specDigest(spec) !== binding.spec.digest) {
    throw new InterfaceError("E_OPENAPI_DIGEST", "the spec differs from what the document pinned");
  }
  return spec;
}

/** Validate an IML document, fetching remote specs and checking their pinned digests. */
export async function validateImlWithSpecs(
  input: InterfaceDocument,
  fetcher: typeof fetch = fetch,
): Promise<ValidationResult> {
  const external: Record<string, SpecRecord> = {};
  const issues: Issue[] = [];
  for (const [name, binding] of Object.entries(input.bindings ?? {})) {
    if (binding.kind !== "openapi" || "inline" in binding.spec) continue;
    try {
      external[name] = await loadSpec(binding, fetcher);
    } catch (error) {
      issues.push({
        code: error instanceof InterfaceError ? error.code : "E_OPENAPI_SPEC",
        path: `/bindings/${name}/spec`,
        message: (error as Error).message,
      });
    }
  }
  return mergeResults(validateIml(input, external), { ok: issues.length === 0, issues });
}
