import { InterfaceError, type FieldSpec, type InputSource, type InterfaceDocument, type InterfaceObject } from "@ciml/core";
import {
  bodyProperties,
  isReadMethod,
  isSafeServer,
  listOperations,
  operationsWithoutId,
  requiredBodyProperties,
  type SpecRecord,
  specServers,
} from "./spec.js";

export interface FromOpenApiOptions {
  spec: SpecRecord;
  id: string;
  title?: string;
  /** Required when the spec lists no absolute https server. */
  server?: string;
  version?: string;
}

export interface FromOpenApiResult {
  document: InterfaceDocument;
  /** Operations left out, with the reason. */
  skipped: string[];
}

function slug(text: string): string {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[^a-z]+/, "");
  return cleaned.replace(/-+$/, "") || "item";
}

function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function fieldFor(name: string, id: string, schema: SpecRecord | undefined, required: boolean): FieldSpec {
  const base = { name: id, label: humanize(name), ...(required ? { required: true } : {}) };
  if (Array.isArray(schema?.enum)) {
    return {
      ...base,
      inputType: "select",
      options: schema.enum.map((value) => ({ label: String(value), value: String(value) })),
    };
  }
  switch (schema?.type) {
    case "integer":
    case "number":
      return { ...base, inputType: "number" };
    case "boolean":
      return { ...base, inputType: "boolean" };
    case "object":
    case "array":
      return { ...base, inputType: "text", placeholder: "JSON" };
    default:
      if (schema?.format === "email") return { ...base, inputType: "email" };
      if (schema?.format === "uri" || schema?.format === "url") return { ...base, inputType: "url" };
      if (schema?.format === "date") return { ...base, inputType: "date" };
      return { ...base, inputType: "text" };
  }
}

/** Generate a working IML document from an OpenAPI 3.x spec. */
export function fromOpenApi(options: FromOpenApiOptions): FromOpenApiResult {
  const { spec } = options;
  const server = options.server ?? specServers(spec).find((url) => url.startsWith("https://"));
  if (!server || !isSafeServer(server)) {
    throw new InterfaceError("E_SERVER_URL", "give an https server: the spec does not list one");
  }
  const info = (spec.info ?? {}) as { title?: string; description?: string; version?: string };
  const title = options.title ?? info.title ?? "API";
  const binding = "api";
  const objects: Record<string, InterfaceObject> = {};
  const data: NonNullable<InterfaceDocument["data"]> = {};
  const used = new Set(["root"]);
  const uniqueId = (wanted: string): string => {
    let id = wanted;
    for (let n = 2; used.has(id); n += 1) id = `${wanted}-${n}`;
    used.add(id);
    return id;
  };
  const skipped = operationsWithoutId(spec).map((name) => `${name}: it has no operationId`);
  const panels = new Map<string, string[]>();

  for (const operation of listOperations(spec)) {
    if (operation.parameters.some((parameter) => parameter.in === "cookie" && parameter.required)) {
      skipped.push(`${operation.operationId}: it needs a cookie parameter`);
      continue;
    }
    const base = uniqueId(slug(operation.operationId));
    const label = operation.summary ?? humanize(operation.operationId);
    const read = isReadMethod(operation.method);
    const usable = operation.parameters.filter((parameter) => parameter.in !== "cookie");
    const tag = operation.tags[0] ?? "API";
    const properties = bodyProperties(spec, operation);
    const required = new Set(requiredBodyProperties(operation));
    const noInputs = usable.length === 0 && !operation.body;

    let member = base;
    if (read && noInputs) {
      const dataName = `d_${base.replace(/[^a-zA-Z0-9]/g, "_")}`;
      data[dataName] = { binding, operation: operation.operationId };
      objects[base] = {
        type: "document",
        purpose: `Shows the result of ${operation.method} ${operation.path}`,
        accessibility: { label },
        value: { data: dataName, format: "json" },
      };
    } else {
      const children: string[] = [];
      const sources: Record<string, InputSource> = {};
      const addField = (name: string, schema: SpecRecord | undefined, isRequired: boolean): void => {
        const fieldId = uniqueId(`${base}.${slug(name)}`);
        objects[fieldId] = {
          type: "field",
          purpose: `The ${name} input of ${operation.operationId}`,
          accessibility: { label: humanize(name) },
          field: fieldFor(name, fieldId, schema, isRequired),
        };
        children.push(fieldId);
        sources[name] = { field: fieldId };
      };
      for (const parameter of usable) addField(parameter.name, parameter.schema, parameter.required);
      for (const [name, schema] of Object.entries(properties)) addField(name, schema, required.has(name));
      if (operation.body && Object.keys(properties).length === 0) {
        addField("body", { type: "object" }, operation.body.required);
      }
      const actionId = uniqueId(`${base}.submit`);
      objects[actionId] = {
        type: "action",
        purpose: `Runs ${operation.method} ${operation.path}`,
        accessibility: { label },
        action: {
          binding,
          operation: operation.operationId,
          inputs: sources,
          effect: read ? "read" : "write",
          ...(read ? {} : { confirm: { title: label } }),
        },
      };
      children.push(actionId);
      objects[base] = { type: "form", purpose: `Inputs for ${operation.operationId}`, accessibility: { label }, children };
      member = base;
    }
    panels.set(tag, [...(panels.get(tag) ?? []), member]);
  }

  const rootChildren: string[] = [];
  for (const [tag, children] of panels) {
    const id = uniqueId(`panel.${slug(tag)}`);
    objects[id] = {
      type: "panel",
      purpose: `Operations tagged ${tag}`,
      accessibility: { label: humanize(tag) },
      children,
    };
    rootChildren.push(id);
  }
  objects.root = {
    type: "workspace",
    purpose: `An interface for ${title}`,
    accessibility: { label: title },
    children: rootChildren,
  };

  return {
    document: {
      schema: "iml/1",
      id: options.id,
      version: options.version ?? (/^\d+\.\d+\.\d+/.test(info.version ?? "") ? (info.version as string) : "1.0.0"),
      title,
      ...(info.description ? { description: info.description.slice(0, 2000) } : {}),
      bindings: { [binding]: { kind: "openapi", server, spec: { inline: spec } } },
      ...(Object.keys(data).length > 0 ? { data } : {}),
      root: "root",
      objects,
    },
    skipped,
  };
}
