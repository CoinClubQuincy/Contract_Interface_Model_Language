import { describe, expect, it, vi } from "vitest";
import { computeDigest, type InterfaceDocument } from "@ciml/core";
import { ApiRuntime, fromOpenApi, listOperations, loadSpec, specDigest, validateIml, validateImlWithSpecs } from "@ciml/openapi";

const spec = {
  openapi: "3.1.0",
  info: { title: "Pets", version: "2.1.0", description: "A pet store" },
  servers: [{ url: "https://api.example.com/v1" }],
  security: [{ bearer: [] }],
  components: {
    parameters: { limit: { name: "limit", in: "query", schema: { type: "integer" } } },
    schemas: { Pet: { type: "object", required: ["name"], properties: { name: { type: "string" }, kind: { type: "string", enum: ["cat", "dog"] }, age: { type: "integer" } } } },
  },
  paths: {
    "/status": { get: { operationId: "getStatus", security: [], summary: "Service status", tags: ["Service"], responses: {} } },
    "/pets": {
      parameters: [{ $ref: "#/components/parameters/limit" }],
      get: { operationId: "listPets", tags: ["Pets"], responses: {} },
      post: {
        operationId: "createPet",
        tags: ["Pets"],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Pet" } } } },
        responses: {},
      },
    },
    "/pets/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { operationId: "getPet", tags: ["Pets"], responses: {} },
      delete: { operationId: "deletePet", tags: ["Pets"], deprecated: true, responses: {} },
    },
    "/raw": { post: { operationId: "postRaw", requestBody: { content: { "application/json": { schema: { type: "array" } } } }, responses: {} } },
    "/noid": { get: { responses: {} } },
    "/cookie": { get: { operationId: "needsCookie", parameters: [{ name: "sid", in: "cookie", required: true, schema: { type: "string" } }], responses: {} } },
  },
};

const doc = (): InterfaceDocument => fromOpenApi({ spec, id: "test.pets" }).document;
const action = (document: InterfaceDocument, id: string) => {
  const found = document.objects[id]?.action;
  if (!found) throw new Error(`no action ${id}`);
  return found;
};
const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

function setup(responses: (Response | Error)[] = [json({ ok: true })], options: Record<string, unknown> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const queue = [...responses];
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    if (next instanceof Error) throw next;
    return (next as Response).clone();
  });
  const sleeps: number[] = [];
  const document = doc();
  const runtime = new ApiRuntime({
    document,
    fetch: fetcher as never,
    token: { get: async () => "token-1", refresh: async () => "token-2" },
    sleep: async (ms) => void sleeps.push(ms),
    ...options,
  });
  return { runtime, calls, fetcher, sleeps, document };
}

const headers = (init: RequestInit) => init.headers as Record<string, string>;

describe("sign-in", () => {
  it("is only offered when the host supplies it", async () => {
    expect(setup().runtime.connect).toBeUndefined();
    const signIn = vi.fn(async () => undefined);
    const { runtime } = setup([json({})], { signIn });
    await runtime.connect?.();
    expect(signIn).toHaveBeenCalled();
  });
});

describe("listOperations", () => {
  it("merges path parameters and follows local refs", () => {
    const operations = listOperations(spec);
    const list = operations.find((operation) => operation.operationId === "listPets");
    expect(list?.parameters[0]).toMatchObject({ name: "limit", in: "query", required: false });
    expect(operations.find((operation) => operation.operationId === "createPet")?.body?.schema.required).toEqual(["name"]);
  });
  it("applies operation security over the global setting", () => {
    const operations = listOperations(spec);
    expect(operations.find((operation) => operation.operationId === "getStatus")?.requiresAuth).toBe(false);
    expect(operations.find((operation) => operation.operationId === "listPets")?.requiresAuth).toBe(true);
  });
  it("does not follow refs that leave the document", () => {
    const remote = { openapi: "3.1.0", paths: { "/x": { $ref: "https://evil.example/paths.json" } } };
    expect(listOperations(remote)).toEqual([]);
  });
  it("survives a self-referencing ref", () => {
    const loop = { openapi: "3.1.0", components: { parameters: { a: { $ref: "#/components/parameters/a" } } }, paths: { "/x": { get: { operationId: "x", parameters: [{ $ref: "#/components/parameters/a" }] } } } };
    expect(listOperations(loop)[0]?.parameters).toEqual([]);
  });
});

describe("fromOpenApi", () => {
  it("generates a document that passes every check", () => {
    expect(validateIml(doc()).issues).toEqual([]);
  });
  it("reports what it left out", () => {
    const { skipped } = fromOpenApi({ spec, id: "test.pets" });
    expect(skipped).toContain("GET /noid: it has no operationId");
    expect(skipped.some((item) => item.startsWith("needsCookie"))).toBe(true);
  });
  it("makes enum fields into selects and body properties into fields", () => {
    const document = doc();
    expect(document.objects["createpet.kind"]?.field).toMatchObject({ inputType: "select" });
    expect(document.objects["createpet.name"]?.field?.required).toBe(true);
    expect(document.objects["createpet.age"]?.field?.inputType).toBe("number");
  });
  it("requires an https server", () => {
    expect(() => fromOpenApi({ spec: { ...spec, servers: [] }, id: "x" })).toThrow(/https server/);
    expect(() => fromOpenApi({ spec, id: "x", server: "http://api.example.com" })).toThrow(/https server/);
  });
});

describe("request building", () => {
  it("calls the bound server with a read, and sends no token to a public operation", async () => {
    const { runtime, calls, document } = setup();
    await runtime.read(document.data?.d_getstatus as never, {});
    expect(calls[0]?.url).toBe("https://api.example.com/v1/status");
    expect(headers(calls[0]!.init).authorization).toBeUndefined();
  });
  it("sends the token to an operation that needs it", async () => {
    const { runtime, calls, document } = setup();
    await runtime.execute(await runtime.prepare(action(document, "listpets.submit"), {}));
    expect(headers(calls[0]!.init).authorization).toBe("Bearer token-1");
  });
  it("refuses redirects and omits ambient credentials", async () => {
    const { runtime, calls, document } = setup();
    await runtime.read(document.data?.d_getstatus as never, {});
    expect(calls[0]?.init.redirect).toBe("error");
    expect(calls[0]?.init.credentials).toBe("omit");
  });
  it.each([
    ["../admin", "..%2Fadmin"],
    ["a/b", "a%2Fb"],
    ["a?x=1", "a%3Fx%3D1"],
    ["a#b", "a%23b"],
    ["café", "caf%C3%A9"],
  ])("encodes path value %s so it cannot change the route", async (value, encoded) => {
    const { runtime, calls, document } = setup();
    await runtime.execute(await runtime.prepare(action(document, "getpet.submit"), { id: value }));
    expect(calls[0]?.url).toBe(`https://api.example.com/v1/pets/${encoded}`);
  });
  it.each(["..", ".", "", "x".repeat(257), "a\nb", "a\u0000b"])("refuses path value %j", async (value) => {
    const { runtime, document } = setup();
    await expect(runtime.prepare(action(document, "getpet.submit"), { id: value })).rejects.toThrow(/not usable|required/);
  });
  it("needs required inputs", async () => {
    const { runtime, document } = setup();
    await expect(runtime.prepare(action(document, "getpet.submit"), {})).rejects.toThrow(/id: required/);
  });
  it("encodes query values", async () => {
    const { runtime, calls, document } = setup();
    await runtime.execute(await runtime.prepare(action(document, "listpets.submit"), { limit: "5" }));
    expect(calls[0]?.url).toBe("https://api.example.com/v1/pets?limit=5");
  });
  it("checks types and enums", async () => {
    const { runtime, document } = setup();
    await expect(runtime.prepare(action(document, "listpets.submit"), { limit: "many" })).rejects.toThrow(/not a number/);
    await expect(runtime.prepare(action(document, "listpets.submit"), { limit: "1.5" })).rejects.toThrow(/whole number/);
    await expect(runtime.prepare(action(document, "createpet.submit"), { name: "x", kind: "bird" })).rejects.toThrow(/one of cat, dog/);
  });
  it("builds a typed JSON body, keeping query parameters out of it", async () => {
    const { runtime, calls, document } = setup();
    const intent = await runtime.prepare(action(document, "createpet.submit"), { name: "Rex", kind: "dog", age: "4", limit: "2" });
    await runtime.execute(intent);
    expect(calls[0]?.url).toBe("https://api.example.com/v1/pets?limit=2");
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual({ name: "Rex", kind: "dog", age: 4 });
    expect(headers(calls[0]!.init)["content-type"]).toBe("application/json");
  });
  it("accepts a whole body as JSON, and refuses oversize requests", async () => {
    const { runtime, document } = setup([json({})], { limits: { maxRequestBytes: 8 } });
    await expect(runtime.prepare(action(document, "postraw.submit"), { body: "[1,2,3,4,5,6,7,8]" })).rejects.toThrow(/too large/);
    const open = setup();
    const intent = await open.runtime.prepare(action(open.document, "postraw.submit"), { body: "[1]" });
    await open.runtime.execute(intent);
    expect(open.calls[0]?.init.body).toBe("[1]");
  });
  it("keeps the base path when the server has one", async () => {
    const { runtime, calls, document } = setup();
    await runtime.read(document.data?.d_getstatus as never, {});
    expect(new URL(calls[0]!.url).pathname).toBe("/v1/status");
  });
  it("refuses a server that is not https at runtime", async () => {
    const document = doc();
    (document.bindings.api as { server: string }).server = "http://api.example.com/v1";
    const fetcher = vi.fn();
    const runtime = new ApiRuntime({ document, fetch: fetcher as never });
    await expect(runtime.read(document.data?.d_getstatus as never, {})).rejects.toThrow(/https/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("intents", () => {
  it("adds an idempotency key to writes, not to reads", async () => {
    const { runtime, calls, document } = setup();
    const write = await runtime.prepare(action(document, "createpet.submit"), { name: "x" });
    await runtime.execute(write);
    expect(headers(calls[0]!.init)["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    const read = await runtime.prepare(action(document, "listpets.submit"), {});
    await runtime.execute(read);
    expect(headers(calls[1]!.init)["Idempotency-Key"]).toBeUndefined();
  });
  it("can turn off the idempotency header", async () => {
    const { runtime, calls, document } = setup([json({})], { idempotencyHeader: null });
    await runtime.execute(await runtime.prepare(action(document, "createpet.submit"), { name: "x" }));
    expect(headers(calls[0]!.init)["Idempotency-Key"]).toBeUndefined();
  });
  it("warns about deletes and deprecated operations", async () => {
    const { runtime, document } = setup();
    const intent = await runtime.prepare(action(document, "deletepet.submit"), { id: "1" });
    expect(intent.warnings.map((warning) => warning.code).sort()).toEqual(["W_DELETES", "W_DEPRECATED"]);
    expect(intent.operation).toBe("DELETE /pets/{id}");
  });
  it("blocks when sign-in is needed", async () => {
    const { runtime, document, fetcher } = setup([json({})], { token: undefined });
    const intent = await runtime.prepare(action(document, "createpet.submit"), { name: "x" });
    expect(intent.blocked).toBe(true);
    await expect(runtime.execute(intent)).rejects.toThrow(/blocked/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("treats a write as a write even if a document claims otherwise", async () => {
    const { runtime, document } = setup();
    const lying = { ...action(document, "createpet.submit"), effect: "read" as const };
    const intent = await runtime.prepare(lying, { name: "x" });
    expect(intent.effect).toBe("write");
    expect(intent.blocked).toBe(true);
  });
  it("refuses to load data through a write operation", async () => {
    const { runtime, fetcher } = setup();
    await expect(runtime.read({ binding: "api", operation: "deletePet" }, { id: "1" })).rejects.toThrow(/not a read/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("retries", () => {
  it.each([429, 502, 503, 504])("retries a read after %i", async (status) => {
    const { runtime, calls, document } = setup([new Response("", { status }), json({ ok: 1 })]);
    expect(await runtime.read(document.data?.d_getstatus as never, {})).toEqual({ ok: 1 });
    expect(calls).toHaveLength(2);
  });
  it("gives up on a read after its attempts", async () => {
    const { runtime, calls, document } = setup([new Response("", { status: 503 })]);
    await expect(runtime.read(document.data?.d_getstatus as never, {})).rejects.toThrow(/503/);
    expect(calls).toHaveLength(3);
  });
  it("retries a read after a network failure", async () => {
    const { runtime, document } = setup([new TypeError("boom"), json({ ok: 1 })]);
    expect(await runtime.read(document.data?.d_getstatus as never, {})).toEqual({ ok: 1 });
  });
  it("never retries a write", async () => {
    for (const failure of [new Response("", { status: 503 }), new TypeError("boom")]) {
      const { runtime, calls, document } = setup([failure]);
      const intent = await runtime.prepare(action(document, "createpet.submit"), { name: "x" });
      await expect(runtime.execute(intent)).rejects.toThrow();
      expect(calls).toHaveLength(1);
    }
  });
  it("does not retry a client error, or leak its body", async () => {
    const { runtime, calls, document } = setup([json({ secret: "server detail" }, { status: 404 })]);
    const error = await runtime.read(document.data?.d_getstatus as never, {}).catch((e: Error) => e);
    expect(calls).toHaveLength(1);
    expect((error as Error).message).toBe("the server returned HTTP 404");
  });
  it("honours Retry-After, within a limit", async () => {
    const { runtime, sleeps, document } = setup([
      new Response("", { status: 429, headers: { "retry-after": "2" } }),
      new Response("", { status: 429, headers: { "retry-after": "9999" } }),
      json({}),
    ]);
    await runtime.read(document.data?.d_getstatus as never, {});
    expect(sleeps).toEqual([2000, 5000]);
  });
});

describe("authentication", () => {
  it("refreshes once after a 401", async () => {
    const { runtime, calls, document } = setup([new Response("", { status: 401 }), json({ ok: 1 })]);
    const intent = await runtime.prepare(action(document, "listpets.submit"), {});
    expect((await runtime.execute(intent)).result).toEqual({ ok: 1 });
    expect(headers(calls[1]!.init).authorization).toBe("Bearer token-2");
  });
  it("does not loop on repeated 401s", async () => {
    const { runtime, calls, document } = setup([new Response("", { status: 401 })]);
    const intent = await runtime.prepare(action(document, "listpets.submit"), {});
    await expect(runtime.execute(intent)).rejects.toThrow(/401/);
    expect(calls).toHaveLength(2);
  });
  it("keeps the idempotency key when a write is refreshed", async () => {
    const { runtime, calls, document } = setup([new Response("", { status: 401 }), json({})]);
    await runtime.execute(await runtime.prepare(action(document, "createpet.submit"), { name: "x" }));
    expect(headers(calls[0]!.init)["Idempotency-Key"]).toBe(headers(calls[1]!.init)["Idempotency-Key"]);
  });
});

describe("circuit breaker", () => {
  it("opens after repeated failures and recovers after the wait", async () => {
    let now = 1000;
    const { runtime, calls, document } = setup([new Response("", { status: 500 })], { now: () => now });
    const read = () => runtime.read(document.data?.d_getstatus as never, {});
    for (let index = 0; index < 3; index += 1) await expect(read()).rejects.toThrow(/500/);
    const before = calls.length;
    await expect(read()).rejects.toThrow(/paused/);
    expect(calls).toHaveLength(before);
    now += 30_001;
    await expect(read()).rejects.toThrow(/500/);
    expect(calls.length).toBeGreaterThan(before);
  });
  it("is not tripped by client errors", async () => {
    const { runtime, document } = setup([new Response("", { status: 404 })]);
    for (let index = 0; index < 5; index += 1) {
      await expect(runtime.read(document.data?.d_getstatus as never, {})).rejects.toThrow(/404/);
    }
  });
  it("resets after a success", async () => {
    const bad = () => new Response("", { status: 500 });
    const { runtime, document } = setup([bad(), bad(), json({ ok: 1 }), bad(), bad(), json({ ok: 2 })], {
      limits: { maxReadAttempts: 1 },
    });
    const read = () => runtime.read(document.data?.d_getstatus as never, {});
    await expect(read()).rejects.toThrow(/500/);
    await expect(read()).rejects.toThrow(/500/);
    expect(await read()).toEqual({ ok: 1 });
    // Without the reset this would be failure four, and the breaker would already be open.
    await expect(read()).rejects.toThrow(/500/);
    await expect(read()).rejects.toThrow(/500/);
    expect(await read()).toEqual({ ok: 2 });
  });
});

describe("responses", () => {
  it.each([
    ["text/html", "<script>alert(1)</script>"],
    ["", "{}"],
  ])("refuses content type %j", async (type, body) => {
    const { runtime, document } = setup([new Response(body, { headers: type ? { "content-type": type } : {} })]);
    await expect(runtime.read(document.data?.d_getstatus as never, {})).rejects.toThrow(/expected JSON/);
  });
  it("accepts json with parameters and +json types", async () => {
    for (const type of ["application/json; charset=utf-8", "application/problem+json"]) {
      const { runtime, document } = setup([new Response("{}", { headers: { "content-type": type } })]);
      expect(await runtime.read(document.data?.d_getstatus as never, {})).toEqual({});
    }
  });
  it("refuses oversize responses, by header and by content", async () => {
    const declared = setup([new Response("{}", { headers: { "content-type": "application/json", "content-length": "99999999" } })]);
    await expect(declared.runtime.read(declared.document.data?.d_getstatus as never, {})).rejects.toThrow(/too large/);
    const actual = setup([json({ pad: "x".repeat(100) })], { limits: { maxResponseBytes: 10 } });
    await expect(actual.runtime.read(actual.document.data?.d_getstatus as never, {})).rejects.toThrow(/too large/);
  });
  it("refuses invalid JSON and handles an empty success", async () => {
    const bad = setup([new Response("{", { headers: { "content-type": "application/json" } })]);
    await expect(bad.runtime.read(bad.document.data?.d_getstatus as never, {})).rejects.toThrow(/not valid JSON/);
    const empty = setup([new Response(null, { status: 204 })]);
    expect(await empty.runtime.read(empty.document.data?.d_getstatus as never, {})).toBeUndefined();
  });
  it("applies select", async () => {
    const { runtime } = setup([json({ a: { b: 7 } })]);
    expect(await runtime.read({ binding: "api", operation: "getStatus", select: "/a/b" }, {})).toBe(7);
  });
  it("times out", async () => {
    const fetcher = vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }));
    const document = doc();
    const runtime = new ApiRuntime({ document, fetch: fetcher as never, limits: { timeoutMs: 5, maxReadAttempts: 1 } });
    await expect(runtime.read(document.data?.d_getstatus as never, {})).rejects.toThrow(/timed out/);
  });
});

describe("remote specs", () => {
  const remote = (digest: string): InterfaceDocument => {
    const document = doc();
    (document.bindings.api as any).spec = { url: "https://specs.example.com/pets.json", digest };
    return document;
  };
  const serve = () => vi.fn(async () => json(spec));

  it("loads a spec that matches its pinned digest", async () => {
    const fetcher = serve();
    const document = remote(specDigest(spec));
    expect((await validateImlWithSpecs(document, fetcher as never)).issues).toEqual([]);
    const runtime = new ApiRuntime({ document, fetch: fetcher as never, token: { get: async () => "t" } });
    await expect(runtime.prepare(action(document, "listpets.submit"), {})).resolves.toBeTruthy();
  });
  it("refuses a spec that differs from the pin", async () => {
    const document = remote(`sha256:${"0".repeat(64)}`);
    const result = await validateImlWithSpecs(document, serve() as never);
    expect(result.issues.map((issue) => issue.code)).toContain("E_OPENAPI_DIGEST");
    const runtime = new ApiRuntime({ document, fetch: serve() as never });
    await expect(runtime.prepare(action(document, "listpets.submit"), {})).rejects.toThrow(/pinned/);
  });
  it("still checks calls against a remote spec", async () => {
    const document = remote(specDigest(spec));
    action(document, "listpets.submit").operation = "ghost";
    const result = await validateImlWithSpecs(document, serve() as never);
    expect(result.issues.map((issue) => issue.code)).toContain("E_OPENAPI_OPERATION");
  });
  it("refuses a spec over plain http", async () => {
    await expect(loadSpec({ kind: "openapi", server: "https://a.example", spec: { url: "http://a.example/s.json", digest: `sha256:${"0".repeat(64)}` } })).rejects.toThrow(/https/);
  });
  it("spec digests ignore key order", () => {
    expect(specDigest({ a: 1, b: 2 })).toBe(specDigest({ b: 2, a: 1 }));
    expect(computeDigest({ a: 1 })).toBe(specDigest({ a: 1 }));
  });
});
