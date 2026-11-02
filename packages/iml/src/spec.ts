/** A small, read-only view of an OpenAPI 3.x document. Only local $refs are followed. */

export type SpecRecord = Record<string, unknown>;

export interface SpecParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  schema: SpecRecord;
}

export interface SpecOperation {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  tags: string[];
  parameters: SpecParameter[];
  body?: { required: boolean; schema: SpecRecord };
  requiresAuth: boolean;
  deprecated: boolean;
}

const METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
const MAX_REF_DEPTH = 16;

export const FORBIDDEN_HEADERS = new Set([
  "authorization", "cookie", "set-cookie", "host", "origin", "referer", "content-length",
  "transfer-encoding", "connection", "upgrade", "te", "trailer", "proxy-authorization",
  "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto", "x-real-ip",
]);

function isRecord(value: unknown): value is SpecRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Follow local references such as #/components/parameters/limit. */
export function resolveRef(spec: SpecRecord, value: unknown, depth = 0): SpecRecord {
  if (!isRecord(value)) return {};
  const ref = value.$ref;
  if (typeof ref !== "string") return value;
  if (depth >= MAX_REF_DEPTH || !ref.startsWith("#/")) return {};
  let current: unknown = spec;
  for (const raw of ref.slice(2).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, key)) return {};
    current = current[key];
  }
  return resolveRef(spec, current, depth + 1);
}

function readParameters(spec: SpecRecord, raw: unknown): SpecParameter[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parameter = resolveRef(spec, item);
    if (typeof parameter.name !== "string" || typeof parameter.in !== "string") return [];
    return [
      {
        name: parameter.name,
        in: parameter.in as SpecParameter["in"],
        required: parameter.required === true || parameter.in === "path",
        schema: resolveRef(spec, parameter.schema),
      },
    ];
  });
}

function readBody(spec: SpecRecord, raw: unknown): SpecOperation["body"] {
  const body = resolveRef(spec, raw);
  const content = body.content;
  if (!isRecord(content)) return undefined;
  const json = Object.entries(content).find(([type]) => /^application\/([\w.-]+\+)?json/i.test(type));
  if (!json) return undefined;
  return {
    required: body.required === true,
    schema: resolveRef(spec, (json[1] as SpecRecord | undefined)?.schema),
  };
}

/** List every operation with an operationId, with path-level parameters merged in. */
export function listOperations(spec: SpecRecord): SpecOperation[] {
  const operations: SpecOperation[] = [];
  const paths = isRecord(spec.paths) ? spec.paths : {};
  for (const [path, rawItem] of Object.entries(paths)) {
    const item = resolveRef(spec, rawItem);
    const shared = readParameters(spec, item.parameters);
    for (const method of METHODS) {
      const operation = item[method];
      if (!isRecord(operation) || typeof operation.operationId !== "string") continue;
      const own = readParameters(spec, operation.parameters);
      const merged = [
        ...shared.filter(
          (parameter) => !own.some((o) => o.name === parameter.name && o.in === parameter.in),
        ),
        ...own,
      ];
      const security = operation.security ?? spec.security;
      operations.push({
        operationId: operation.operationId,
        method: method.toUpperCase(),
        path,
        ...(typeof operation.summary === "string" ? { summary: operation.summary } : {}),
        tags: Array.isArray(operation.tags) ? operation.tags.map(String) : [],
        parameters: merged,
        body: readBody(spec, operation.requestBody),
        requiresAuth: Array.isArray(security) && security.length > 0,
        deprecated: operation.deprecated === true,
      });
    }
  }
  return operations;
}

/** Operations without an id cannot be referred to. These are reported rather than guessed at. */
export function operationsWithoutId(spec: SpecRecord): string[] {
  const missing: string[] = [];
  const paths = isRecord(spec.paths) ? spec.paths : {};
  for (const [path, rawItem] of Object.entries(paths)) {
    const item = resolveRef(spec, rawItem);
    for (const method of METHODS) {
      const operation = item[method];
      if (isRecord(operation) && typeof operation.operationId !== "string") {
        missing.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  return missing;
}

/** The names a document may supply: parameters, the body as a whole, or top-level body properties. */
export function bodyProperties(spec: SpecRecord, operation: SpecOperation): Record<string, SpecRecord> {
  const properties = operation.body?.schema.properties;
  if (!isRecord(properties)) return {};
  return Object.fromEntries(
    Object.entries(properties).map(([name, schema]) => [name, resolveRef(spec, schema)]),
  );
}

export function requiredBodyProperties(operation: SpecOperation): string[] {
  const required = operation.body?.schema.required;
  return Array.isArray(required) ? required.map(String) : [];
}

export function isReadMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

/** Check a server URL is one a client may call: https, with no credentials, query or fragment. */
export function isSafeServer(server: string): boolean {
  try {
    const url = new URL(server);
    return (
      url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
    );
  } catch {
    return false;
  }
}

/** Absolute server URLs the spec lists. A binding has to use one of them when there are any. */
export function specServers(spec: SpecRecord): string[] {
  if (!Array.isArray(spec.servers)) return [];
  return spec.servers.flatMap((entry) => {
    const url = isRecord(entry) ? entry.url : undefined;
    return typeof url === "string" && /^https?:\/\//.test(url) ? [url.replace(/\/+$/, "")] : [];
  });
}
