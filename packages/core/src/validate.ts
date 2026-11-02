import { Ajv2020 } from "ajv/dist/2020.js";
import { computeDigest } from "./canonical.js";
import { documentSchema } from "./schema.js";
import type { InputSource, InterfaceDocument, Issue, ValidationResult } from "./types.js";
import {
  CONTEXT_VALUES,
  FORBIDDEN_KEYS,
  PRESENTATION_ROLES,
  PRESENTATION_TOKEN_KEYS,
  RAW_STYLE_KEYS,
  TOKEN_GROUPS,
  isSafeTokenValue,
  type SchemaId,
} from "./vocabulary.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const checkSchema = ajv.compile(documentSchema);

const URL_KEYS = new Set(["homepage", "icon", "src", "href"]);
const TOKEN_REFERENCE = /^\{([a-z]+)\.([A-Za-z0-9_-]+)\}$/;

function escapePointer(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

function has(record: object | undefined, key: string): boolean {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key);
}

/** Only https and ipfs links. This rules out javascript:, data:, file: and plain http. */
export function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "ipfs:";
  } catch {
    return false;
  }
}

/** These objects are maps whose keys the author names, so their keys are not format keywords. */
const NAME_MAPS = new Set(["objects", "data", "inputs", "tokens", "color", "typography", "spacing", "size", "radius", "elevation", "motion"]);
const MAX_DEPTH = 64;

function walkForbidden(
  value: unknown,
  path: string,
  issues: Issue[],
  depth: number,
  parentIsNameMap: boolean,
): void {
  if (depth > MAX_DEPTH) {
    issues.push({ code: "E_SCHEMA", path, message: `nesting is deeper than ${MAX_DEPTH} levels` });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkForbidden(item, `${path}/${index}`, issues, depth + 1, false));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const key of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[key];
    const childPath = `${path}/${escapePointer(key)}`;
    if (!parentIsNameMap && FORBIDDEN_KEYS.has(key)) {
      issues.push({
        code: "E_FORBIDDEN_KEY",
        path: childPath,
        message: `"${key}" is forbidden: documents describe interfaces and cannot carry execution`,
      });
    }
    if (!parentIsNameMap && URL_KEYS.has(key) && typeof child === "string" && !isSafeUrl(child)) {
      issues.push({ code: "E_URL_SCHEME", path: childPath, message: "links must use https or ipfs" });
    }
    walkForbidden(child, childPath, issues, depth + 1, !parentIsNameMap && NAME_MAPS.has(key));
  }
}

/** Walk everything except bindings: an ABI or OpenAPI spec can legally use any names. */
function checkForbidden(document: Record<string, unknown>, issues: Issue[]): void {
  const { bindings: _bindings, ...rest } = document;
  walkForbidden(rest, "", issues, 0, false);
}

function checkGraph(document: InterfaceDocument, issues: Issue[]): void {
  const { objects, root } = document;
  if (!has(objects, root)) {
    issues.push({ code: "E_ROOT", path: "/root", message: `root "${root}" is not an object` });
    return;
  }
  const parents = new Map<string, string>();
  for (const [id, object] of Object.entries(objects)) {
    for (const child of object.children ?? []) {
      if (!has(objects, child)) {
        issues.push({
          code: "E_UNKNOWN_CHILD",
          path: `/objects/${id}/children`,
          message: `child "${child}" is not an object`,
        });
      } else if (parents.has(child)) {
        issues.push({
          code: "E_DUPLICATE_PARENT",
          path: `/objects/${id}/children`,
          message: `"${child}" already belongs to "${parents.get(child)}"`,
        });
      } else {
        parents.set(child, id);
      }
    }
  }
  if (parents.has(root)) {
    issues.push({ code: "E_ROOT", path: "/root", message: "the root cannot be a child" });
  }

  const reached = new Set<string>();
  const visit = (id: string, ancestors: Set<string>): void => {
    if (ancestors.has(id)) {
      issues.push({ code: "E_CYCLE", path: `/objects/${id}`, message: "containment has a cycle" });
      return;
    }
    if (reached.has(id)) return;
    reached.add(id);
    const next = new Set(ancestors).add(id);
    for (const child of objects[id]?.children ?? []) {
      if (has(objects, child)) visit(child, next);
    }
    const fallback = objects[id]?.extension?.fallback;
    if (fallback && has(objects, fallback)) visit(fallback, next);
  };
  visit(root, new Set());
  for (const id of Object.keys(objects)) {
    if (!reached.has(id)) {
      const inCycle = parents.has(id);
      issues.push({
        code: inCycle ? "E_CYCLE" : "E_ORPHAN",
        path: `/objects/${id}`,
        message: inCycle ? "containment has a cycle" : "the object cannot be reached from the root",
      });
    }
  }
}

function checkInputSource(
  source: InputSource,
  path: string,
  document: InterfaceDocument,
  issues: Issue[],
): void {
  if ("field" in source) {
    const target = document.objects[source.field];
    if (!has(document.objects, source.field) || !target?.field) {
      issues.push({
        code: "E_UNKNOWN_FIELD",
        path,
        message: `"${source.field}" is not a field object`,
      });
    }
  } else if ("context" in source) {
    const allowed: readonly string[] = CONTEXT_VALUES[document.schema as SchemaId] ?? [];
    if (!allowed.includes(source.context)) {
      issues.push({
        code: "E_UNKNOWN_CONTEXT",
        path,
        message: `"${source.context}" is not available to ${document.schema} documents`,
      });
    }
  }
}

function checkReferences(document: InterfaceDocument, issues: Issue[]): void {
  const checkBinding = (name: string, path: string): void => {
    if (!has(document.bindings, name)) {
      issues.push({ code: "E_UNKNOWN_BINDING", path, message: `no binding "${name}"` });
    }
  };
  for (const [id, data] of Object.entries(document.data ?? {})) {
    checkBinding(data.binding, `/data/${id}/binding`);
    for (const [name, source] of Object.entries(data.inputs ?? {})) {
      checkInputSource(source, `/data/${id}/inputs/${name}`, document, issues);
    }
  }
  for (const [id, object] of Object.entries(document.objects)) {
    const path = `/objects/${id}`;
    if (object.value && !has(document.data, object.value.data)) {
      issues.push({
        code: "E_UNKNOWN_DATA",
        path: `${path}/value/data`,
        message: `no data "${object.value.data}"`,
      });
    }
    if (object.action) {
      checkBinding(object.action.binding, `${path}/action/binding`);
      for (const [name, source] of Object.entries(object.action.inputs ?? {})) {
        checkInputSource(source, `${path}/action/inputs/${name}`, document, issues);
      }
      if (object.action.value) {
        checkInputSource(object.action.value, `${path}/action/value`, document, issues);
      }
    }
    if (object.field && object.type !== "field") {
      issues.push({
        code: "E_OBJECT_SHAPE",
        path: `${path}/field`,
        message: 'only "field" objects can have a field block',
      });
    }
    if (object.type === "field" && !object.field) {
      issues.push({ code: "E_OBJECT_SHAPE", path, message: "a field object needs a field block" });
    }
    if (object.field?.inputType === "amount" && object.field.decimals === undefined) {
      issues.push({
        code: "E_OBJECT_SHAPE",
        path: `${path}/field/decimals`,
        message: "an amount field needs decimals, or a typed 1 could mean 1 base unit",
      });
    }
    if (object.field?.inputType === "select" && !object.field.options?.length) {
      issues.push({
        code: "E_OBJECT_SHAPE",
        path: `${path}/field/options`,
        message: "a select field needs options",
      });
    }
    if (object.type === "action" && !object.action && !object.href) {
      issues.push({ code: "E_OBJECT_SHAPE", path, message: "an action needs an action or href" });
    }
    if (object.type === "extension") {
      const fallback = object.extension?.fallback;
      if (!fallback) {
        issues.push({
          code: "E_EXTENSION_FALLBACK",
          path,
          message: "an extension needs a fallback object, for renderers that lack it",
        });
      } else if (!has(document.objects, fallback)) {
        issues.push({
          code: "E_EXTENSION_FALLBACK",
          path: `${path}/extension/fallback`,
          message: `no object "${fallback}"`,
        });
      }
    }
  }
}

function checkPresentation(document: InterfaceDocument, issues: Issue[]): void {
  for (const [group, values] of Object.entries(document.tokens ?? {})) {
    for (const [name, value] of Object.entries(values ?? {})) {
      if (!isSafeTokenValue(value)) {
        issues.push({
          code: "E_TOKEN_VALUE",
          path: `/tokens/${group}/${name}`,
          message: "token values cannot contain url(), markup or CSS syntax",
        });
      }
    }
  }
  for (const [id, object] of Object.entries(document.objects)) {
    for (const [key, value] of Object.entries(object.presentation ?? {})) {
      const path = `/objects/${id}/presentation/${escapePointer(key)}`;
      if (has(PRESENTATION_ROLES, key)) {
        if (!PRESENTATION_ROLES[key]?.includes(value)) {
          issues.push({ code: "E_PRESENTATION", path, message: `"${value}" is not a ${key}` });
        }
        continue;
      }
      if (RAW_STYLE_KEYS.has(key) || !PRESENTATION_TOKEN_KEYS.includes(key)) {
        issues.push({
          code: "E_RAW_STYLE",
          path,
          message: `"${key}" is not a presentation role or token slot`,
        });
        continue;
      }
      const match = TOKEN_REFERENCE.exec(value);
      const group = match?.[1] as (typeof TOKEN_GROUPS)[number] | undefined;
      if (!match || !group || !TOKEN_GROUPS.includes(group)) {
        issues.push({
          code: "E_RAW_STYLE",
          path,
          message: "presentation values must be token references, such as {color.accent}",
        });
      } else if (!has(document.tokens?.[group], match[2] ?? "")) {
        issues.push({ code: "E_UNKNOWN_TOKEN", path, message: `no token ${match[1]}.${match[2]}` });
      }
    }
  }
}

function checkFieldNames(document: InterfaceDocument, issues: Issue[]): void {
  const seen = new Map<string, string>();
  for (const [id, object] of Object.entries(document.objects)) {
    if (!object.field) continue;
    const earlier = seen.get(object.field.name);
    if (earlier) {
      issues.push({
        code: "E_DUPLICATE_FIELD",
        path: `/objects/${id}/field/name`,
        message: `field name "${object.field.name}" is already used by "${earlier}"`,
      });
    }
    seen.set(object.field.name, id);
  }
}

function digestMatches(record: Record<string, unknown>, digest: string): boolean {
  try {
    return computeDigest(record) === digest;
  } catch {
    return false; // Content that cannot be canonicalized cannot match any digest.
  }
}

/** Validate what is common to both kinds. @ciml/evm and @ciml/openapi add binding checks. */
export function validateDocument(input: unknown): ValidationResult {
  const issues: Issue[] = [];
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      ok: false,
      issues: [{ code: "E_SCHEMA", path: "", message: "a document must be a JSON object" }],
    };
  }
  const record = input as Record<string, unknown>;
  checkForbidden(record, issues);
  if (!checkSchema(input)) {
    for (const error of checkSchema.errors ?? []) {
      issues.push({
        code: "E_SCHEMA",
        path: error.instancePath,
        message: error.message ?? "does not match the schema",
      });
    }
    return { ok: false, issues };
  }
  const document = input as InterfaceDocument;
  checkGraph(document, issues);
  checkReferences(document, issues);
  checkPresentation(document, issues);
  checkFieldNames(document, issues);
  if (document.integrity && !digestMatches(record, document.integrity.digest)) {
    issues.push({
      code: "E_DIGEST",
      path: "/integrity/digest",
      message: "the digest does not match the document's content",
    });
  }
  return { ok: issues.length === 0, issues };
}

/** Combine results from several validation passes. */
export function mergeResults(...results: ValidationResult[]): ValidationResult {
  const issues = results.flatMap((result) => result.issues);
  return { ok: issues.length === 0, issues };
}
