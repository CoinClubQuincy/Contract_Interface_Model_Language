import {
  type ActionBinding,
  type DataBinding,
  type HostContext,
  type Intent,
  InterfaceError,
  type InterfaceDocument,
  type InterfaceRuntime,
  type OpenApiBinding,
  readPointer,
} from "@ciml/core";
import {
  bodyProperties,
  FORBIDDEN_HEADERS,
  isReadMethod,
  isSafeServer,
  listOperations,
  type SpecOperation,
  type SpecRecord,
} from "./spec.js";
import { loadSpec } from "./validate.js";

/** Supplies bearer tokens. Refresh is called once after a 401. Tokens go only to the bound server. */
export interface TokenProvider {
  get(): Promise<string | undefined>;
  refresh?(): Promise<string | undefined>;
}

export interface ApiLimits {
  timeoutMs: number;
  maxResponseBytes: number;
  maxRequestBytes: number;
  maxPathParameterLength: number;
  maxReadAttempts: number;
  failureThreshold: number;
  breakerOpenMs: number;
  maxRetryAfterMs: number;
}

export const DEFAULT_LIMITS: ApiLimits = {
  timeoutMs: 15_000,
  maxResponseBytes: 5 * 1024 * 1024,
  maxRequestBytes: 1024 * 1024,
  maxPathParameterLength: 256,
  maxReadAttempts: 3,
  failureThreshold: 3,
  breakerOpenMs: 30_000,
  maxRetryAfterMs: 5_000,
};

const RETRYABLE = new Set([429, 502, 503, 504]);

export interface ApiRuntimeOptions {
  document: InterfaceDocument;
  fetch?: typeof fetch;
  token?: TokenProvider;
  /** The signed-in subject, exposed to documents as auth.subject. */
  subject?: string;
  signIn?: () => Promise<void>;
  limits?: Partial<ApiLimits>;
  /** The header that carries the idempotency key on writes. Set null if your API's CORS rejects it. */
  idempotencyHeader?: string | null;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface ApiPayload {
  bindingName: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  requiresAuth: boolean;
}

interface Breaker {
  failures: number;
  openUntil: number;
}

class RetryableFailure extends Error {
  constructor(
    readonly error: InterfaceError,
    readonly retryAfterMs?: number,
  ) {
    super(error.message);
  }
}

function coerce(name: string, schema: SpecRecord | undefined, raw: unknown): unknown {
  let value = raw;
  const type = schema?.type;
  if ((type === "integer" || type === "number") && typeof raw === "string") {
    value = Number(raw.trim());
    if (raw.trim() === "" || !Number.isFinite(value)) {
      throw new InterfaceError("E_INPUT", `${name}: not a number`);
    }
    if (type === "integer" && !Number.isSafeInteger(value)) {
      throw new InterfaceError("E_INPUT", `${name}: not a whole number`);
    }
  } else if (type === "boolean" && typeof raw === "string") {
    if (raw !== "true" && raw !== "false") {
      throw new InterfaceError("E_INPUT", `${name}: not true or false`);
    }
    value = raw === "true";
  } else if ((type === "object" || type === "array") && typeof raw === "string") {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      throw new InterfaceError("E_INPUT", `${name}: expected JSON`);
    }
  }
  if (Array.isArray(schema?.enum) && !schema.enum.includes(value)) {
    throw new InterfaceError("E_INPUT", `${name}: must be one of ${schema.enum.join(", ")}`);
  }
  return value;
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export class ApiRuntime implements InterfaceRuntime {
  private readonly document: InterfaceDocument;
  private readonly fetcher: typeof fetch;
  private readonly token?: TokenProvider;
  private readonly subject?: string;
  private readonly limits: ApiLimits;
  private readonly idempotencyHeader: string | null;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly breakers = new Map<string, Breaker>();
  /** Only present when the host supplies sign-in, so public APIs do not offer it. */
  readonly connect?: () => Promise<void>;
  private readonly specs = new Map<string, Promise<{ spec: SpecRecord; operations: SpecOperation[] }>>();

  constructor(options: ApiRuntimeOptions) {
    this.document = options.document;
    this.fetcher = options.fetch ?? ((...args) => fetch(...args));
    this.token = options.token;
    this.subject = options.subject;
    if (options.signIn) this.connect = options.signIn;
    this.limits = { ...DEFAULT_LIMITS, ...options.limits };
    this.idempotencyHeader = options.idempotencyHeader === undefined ? "Idempotency-Key" : options.idempotencyHeader;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  context(): HostContext {
    return { "auth.subject": this.subject };
  }

  private binding(name: string): OpenApiBinding {
    const binding = this.document.bindings[name];
    if (binding?.kind !== "openapi") throw new InterfaceError("E_UNKNOWN_BINDING", `no API binding "${name}"`);
    if (!isSafeServer(binding.server)) throw new InterfaceError("E_SERVER_URL", "the server must use https");
    return binding;
  }

  private operation(bindingName: string, operationId: string): Promise<{ spec: SpecRecord; operation: SpecOperation }> {
    let entry = this.specs.get(bindingName);
    if (!entry) {
      entry = loadSpec(this.binding(bindingName), this.fetcher).then((spec) => ({
        spec,
        operations: listOperations(spec),
      }));
      this.specs.set(bindingName, entry);
    }
    return entry.then(({ spec, operations }) => {
      const operation = operations.find((item) => item.operationId === operationId);
      if (!operation) throw new InterfaceError("E_OPENAPI_OPERATION", `no operation "${operationId}"`);
      return { spec, operation };
    });
  }

  private build(
    bindingName: string,
    spec: SpecRecord,
    operation: SpecOperation,
    inputs: Record<string, unknown>,
  ): ApiPayload {
    const binding = this.binding(bindingName);
    const base = new URL(binding.server.endsWith("/") ? binding.server : `${binding.server}/`);
    let path = operation.path;
    const query = new URLSearchParams();
    const headers: Record<string, string> = { accept: "application/json" };
    const used = new Set<string>();

    for (const parameter of operation.parameters) {
      const raw = inputs[parameter.name];
      if (raw === undefined) {
        if (parameter.required && parameter.in !== "cookie") {
          throw new InterfaceError("E_INPUT", `${parameter.name}: required`);
        }
        continue;
      }
      used.add(parameter.name);
      const value = toText(coerce(parameter.name, parameter.schema, raw));
      if (parameter.in === "path") {
        if (
          value === "" ||
          value === "." ||
          value === ".." ||
          value.length > this.limits.maxPathParameterLength ||
          // Control characters could split the request line.
          /[\u0000-\u001f\u007f]/.test(value)
        ) {
          throw new InterfaceError("E_INPUT", `${parameter.name}: not usable in a URL path`);
        }
        path = path.split(`{${parameter.name}}`).join(encodeURIComponent(value));
      } else if (parameter.in === "query") {
        query.append(parameter.name, value);
      } else if (parameter.in === "header") {
        if (FORBIDDEN_HEADERS.has(parameter.name.toLowerCase())) {
          throw new InterfaceError("E_INPUT", `${parameter.name}: this header cannot be set`);
        }
        if (/[\r\n]/.test(value)) throw new InterfaceError("E_INPUT", `${parameter.name}: invalid header value`);
        headers[parameter.name] = value;
      } else {
        throw new InterfaceError("E_INPUT", `${parameter.name}: documents cannot set cookies`);
      }
    }
    if (/\{[^}]*\}/.test(path)) throw new InterfaceError("E_INPUT", `the path ${path} has unfilled parts`);

    const url = new URL(path.replace(/^\/+/, ""), base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      throw new InterfaceError("E_SERVER_URL", "the request would leave the bound server");
    }
    url.search = query.toString();

    let body: string | undefined;
    if (operation.body) {
      const properties = bodyProperties(spec, operation);
      let content: unknown;
      if (inputs.body !== undefined && !Object.prototype.hasOwnProperty.call(properties, "body")) {
        content = coerce("body", { type: "object" }, inputs.body);
      } else {
        const entries = Object.entries(inputs).filter(
          ([name]) => !used.has(name) && Object.prototype.hasOwnProperty.call(properties, name),
        );
        content = Object.fromEntries(entries.map(([name, value]) => [name, coerce(name, properties[name], value)]));
      }
      body = JSON.stringify(content);
      if (new TextEncoder().encode(body).length > this.limits.maxRequestBytes) {
        throw new InterfaceError("E_INPUT", "the request is too large");
      }
      headers["content-type"] = "application/json";
    }
    return {
      bindingName,
      method: operation.method,
      url: url.toString(),
      headers,
      ...(body === undefined ? {} : { body }),
      requiresAuth: operation.requiresAuth,
    };
  }

  private breaker(name: string): Breaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = { failures: 0, openUntil: 0 };
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  private async attempt(payload: ApiPayload, token: string | undefined): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.limits.timeoutMs);
    try {
      return await this.fetcher(payload.url, {
        method: payload.method,
        headers: { ...payload.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(payload.body === undefined ? {} : { body: payload.body }),
        // A redirect could carry the request, and its token, to another host.
        redirect: "error",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async readBody(response: Response): Promise<unknown> {
    if (response.status === 204 || response.status === 205) return undefined;
    const type = response.headers.get("content-type") ?? "";
    if (!/^application\/([\w.-]+\+)?json\b/i.test(type)) {
      throw new InterfaceError("E_CONTENT_TYPE", `expected JSON, got "${type || "nothing"}"`);
    }
    const declared = Number(response.headers.get("content-length") ?? 0);
    const tooLarge = (): InterfaceError => new InterfaceError("E_RESPONSE_TOO_LARGE", "the response is too large");
    if (declared > this.limits.maxResponseBytes) throw tooLarge();
    const decoder = new TextDecoder();
    let text = "";
    let total = 0;
    const reader = response.body?.getReader();
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > this.limits.maxResponseBytes) {
          // Not awaited: a stalled server must not be able to hold this up.
          void reader.cancel().catch(() => undefined);
          throw tooLarge();
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    }
    try {
      return text === "" ? undefined : (JSON.parse(text) as unknown);
    } catch {
      throw new InterfaceError("E_BAD_RESPONSE", "the response is not valid JSON");
    }
  }

  private async sendOnce(payload: ApiPayload): Promise<unknown> {
    const useToken = payload.requiresAuth && this.token;
    let token = useToken ? await this.token?.get() : undefined;
    let response: Response;
    try {
      response = await this.attempt(payload, token);
      if (response.status === 401 && useToken && this.token?.refresh) {
        token = await this.token.refresh();
        if (token) response = await this.attempt(payload, token);
      }
    } catch (error) {
      const timedOut = (error as Error).name === "AbortError";
      throw new RetryableFailure(
        new InterfaceError(timedOut ? "E_TIMEOUT" : "E_NETWORK", timedOut ? "the request timed out" : "the request failed"),
      );
    }
    if (RETRYABLE.has(response.status) || response.status >= 500) {
      const seconds = Number(response.headers.get("retry-after"));
      throw new RetryableFailure(
        new InterfaceError("E_HTTP", `the server returned HTTP ${response.status}`),
        Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined,
      );
    }
    if (!response.ok) {
      // The body stays unread: it is untrusted text, and hosts should not show it as an explanation.
      throw new InterfaceError("E_HTTP", `the server returned HTTP ${response.status}`);
    }
    return this.readBody(response);
  }

  private async send(payload: ApiPayload): Promise<unknown> {
    const breaker = this.breaker(payload.bindingName);
    if (this.now() < breaker.openUntil) {
      throw new InterfaceError("E_CIRCUIT_OPEN", "this API keeps failing, so requests are paused");
    }
    // Only reads repeat automatically. A retried write could happen twice.
    const attempts = isReadMethod(payload.method) ? this.limits.maxReadAttempts : 1;
    let failure: RetryableFailure | undefined;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0) {
        const backoff = failure?.retryAfterMs ?? 200 * 2 ** (attempt - 1);
        await this.sleep(Math.min(backoff, this.limits.maxRetryAfterMs));
      }
      try {
        const result = await this.sendOnce(payload);
        breaker.failures = 0;
        return result;
      } catch (error) {
        if (!(error instanceof RetryableFailure)) {
          breaker.failures = 0;
          throw error;
        }
        failure = error;
      }
    }
    breaker.failures += 1;
    if (breaker.failures >= this.limits.failureThreshold) {
      breaker.openUntil = this.now() + this.limits.breakerOpenMs;
      breaker.failures = 0;
    }
    throw (failure as RetryableFailure).error;
  }

  async read(data: DataBinding, inputs: Record<string, unknown>): Promise<unknown> {
    const { spec, operation } = await this.operation(data.binding, data.operation);
    if (!isReadMethod(operation.method)) {
      throw new InterfaceError("E_OPENAPI_EFFECT", `${operation.method} is not a read`);
    }
    const result = await this.send(this.build(data.binding, spec, operation, inputs));
    return readPointer(result, data.select);
  }

  /** Build the exact request and describe it. Nothing is sent. */
  async prepare(action: ActionBinding, inputs: Record<string, unknown>): Promise<Intent> {
    const { spec, operation } = await this.operation(action.binding, action.operation);
    const payload = this.build(action.binding, spec, operation, inputs);
    const warnings: Intent["warnings"] = [];
    let blocked = false;
    const write = !isReadMethod(operation.method);
    if (write && this.idempotencyHeader) {
      // Created once per prepared action, so repeats of this intent are safe for the server to spot.
      payload.headers[this.idempotencyHeader] = globalThis.crypto.randomUUID();
    }
    if (action.effect === "read" && write) {
      warnings.push({ code: "W_EFFECT_MISMATCH", message: `${operation.method} changes data, but the document calls this a read.` });
      blocked = true;
    }
    if (operation.method === "DELETE") {
      warnings.push({ code: "W_DELETES", message: "This deletes data on the server." });
    }
    if (operation.deprecated) {
      warnings.push({ code: "W_DEPRECATED", message: "The API marks this operation as deprecated." });
    }
    if (operation.requiresAuth && !(await this.token?.get())) {
      warnings.push({ code: "W_SIGN_IN", message: "Sign in first." });
      blocked = true;
    }
    return {
      title: action.confirm?.title ?? operation.summary ?? operation.operationId,
      effect: write ? "write" : "read",
      target: new URL(payload.url).origin,
      operation: `${operation.method} ${operation.path}`,
      inputs: Object.entries(inputs).map(([name, value]) => ({
        name,
        type: "input",
        value: toText(value),
      })),
      warnings,
      blocked,
      payload,
    };
  }

  async execute(intent: Intent): Promise<{ id?: string; result?: unknown }> {
    if (intent.blocked) throw new InterfaceError("E_BLOCKED", "this action is blocked");
    return { result: await this.send(intent.payload as ApiPayload) };
  }
}
