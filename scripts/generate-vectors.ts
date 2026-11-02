/** Writes conformance/vectors. Each file is plain JSON, so any implementation can use them. */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { documentSchema, type InterfaceDocument, withDigest } from "../packages/core/src/index.js";

const root = new URL("../conformance/vectors/", import.meta.url);
type Doc = Record<string, any>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const load = (name: string): Doc =>
  JSON.parse(readFileSync(new URL(`../examples/documents/${name}`, import.meta.url), "utf8")) as Doc;

const abi = [
  { type: "function", name: "total", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "send", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "fund", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "pick", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "pick", stateMutability: "view", inputs: [{ name: "name", type: "string" }], outputs: [{ name: "", type: "uint256" }] },
];

const ciml: Doc = {
  schema: "ciml/2",
  id: "vector.contract",
  version: "1.0.0",
  title: "Vector",
  tokens: { color: { accent: "#0b6e4f" } },
  bindings: { c: { kind: "evm", chainId: 1, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", abi } },
  data: { total: { binding: "c", operation: "total" } },
  root: "root",
  objects: {
    root: { type: "workspace", purpose: "Root", accessibility: { label: "Root" }, children: ["total", "form"] },
    total: { type: "metric", purpose: "Total", accessibility: { label: "Total" }, value: { data: "total" } },
    form: { type: "form", purpose: "Send", accessibility: { label: "Send" }, children: ["to", "amount", "go"] },
    to: { type: "field", purpose: "To", accessibility: { label: "To" }, field: { name: "to", inputType: "address" } },
    amount: { type: "field", purpose: "Amount", accessibility: { label: "Amount" }, field: { name: "amount", inputType: "amount", decimals: 6 } },
    go: {
      type: "action",
      purpose: "Send",
      accessibility: { label: "Send" },
      action: { binding: "c", operation: "send", effect: "write", inputs: { to: { field: "to" }, amount: { field: "amount" } } },
    },
  },
};

const spec = {
  openapi: "3.1.0",
  info: { title: "Vector", version: "1.0.0" },
  servers: [{ url: "https://api.example.com" }],
  paths: {
    "/items/{id}": {
      get: {
        operationId: "getItem",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
      delete: {
        operationId: "deleteItem",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Gone" } },
      },
    },
    "/items": {
      post: {
        operationId: "createItem",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/secure": {
      get: {
        operationId: "getSecure",
        parameters: [{ name: "Authorization", in: "header", schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
  },
};

const iml: Doc = {
  schema: "iml/1",
  id: "vector.api",
  version: "1.0.0",
  title: "Vector",
  bindings: { a: { kind: "openapi", server: "https://api.example.com", spec: { inline: spec } } },
  root: "root",
  objects: {
    root: { type: "workspace", purpose: "Root", accessibility: { label: "Root" }, children: ["id", "go"] },
    id: { type: "field", purpose: "Id", accessibility: { label: "Id" }, field: { name: "id", inputType: "text" } },
    go: {
      type: "action",
      purpose: "Delete",
      accessibility: { label: "Delete" },
      action: { binding: "a", operation: "deleteItem", effect: "write", inputs: { id: { field: "id" } } },
    },
  },
};

type Mutator = (doc: Doc) => void;
const invalid: [string, string, Doc, string[], Mutator][] = [
  ["schema-missing-title", "A required key is missing.", ciml, ["E_SCHEMA"], (d) => void delete d.title],
  ["schema-unknown-key", "Unknown keys are rejected, so nothing can be smuggled through.", ciml, ["E_SCHEMA"], (d) => { d.objects.total.onClick = "x"; }],
  ["schema-unknown-type", "The semantic vocabulary is closed.", ciml, ["E_SCHEMA"], (d) => { d.objects.total.type = "iframe"; }],
  ["schema-kind", "A ciml/2 document cannot have an API binding.", ciml, ["E_SCHEMA_KIND"], (d) => { d.bindings.c = { kind: "openapi", server: "https://api.example.com", spec: { inline: spec } }; }],
  ["iml-kind", "An iml/1 document cannot have a contract binding.", iml, ["E_SCHEMA_KIND"], (d) => { d.bindings.a = clone(ciml.bindings.c); }],
  ["forbidden-script", "Execution keys are refused by name at any depth.", ciml, ["E_FORBIDDEN_KEY"], (d) => { d.objects.total.script = "alert(1)"; }],
  ["forbidden-nested-html", "Literals cannot hide execution keys.", ciml, ["E_FORBIDDEN_KEY"], (d) => { d.objects.go.action.inputs.to = { literal: { html: "<img>" } }; }],
  ["root-missing", "The root must exist.", ciml, ["E_ROOT"], (d) => { d.root = "nothing"; }],
  ["cycle", "Containment cannot loop.", ciml, ["E_CYCLE"], (d) => { d.objects.total.children = ["form"]; d.objects.form.children = ["to", "amount", "go", "total"]; d.objects.root.children = []; }],
  ["orphan", "Every object must be reachable.", ciml, ["E_ORPHAN"], (d) => { d.objects.extra = { type: "text", purpose: "Extra", accessibility: { label: "Extra" }, text: "x" }; }],
  ["unknown-child", "Children must exist.", ciml, ["E_UNKNOWN_CHILD"], (d) => { d.objects.root.children.push("ghost"); }],
  ["duplicate-parent", "An object has one parent.", ciml, ["E_DUPLICATE_PARENT"], (d) => { d.objects.root.children.push("to"); }],
  ["raw-style", "Raw styling is refused.", ciml, ["E_RAW_STYLE"], (d) => { d.objects.total.presentation = { color: "red" }; }],
  ["raw-style-literal", "A token slot needs a token reference.", ciml, ["E_RAW_STYLE"], (d) => { d.objects.total.presentation = { tone: "red" }; }],
  ["unknown-token", "Token references must resolve.", ciml, ["E_UNKNOWN_TOKEN"], (d) => { d.objects.total.presentation = { tone: "{color.missing}" }; }],
  ["token-url", "A token value cannot make network requests.", ciml, ["E_TOKEN_VALUE"], (d) => { d.tokens.color.accent = "url(https://example.com/x)"; }],
  ["bad-role", "Roles have closed values.", ciml, ["E_PRESENTATION"], (d) => { d.objects.total.presentation = { variant: "huge" }; }],
  ["url-javascript", "Only https and ipfs links.", ciml, ["E_URL_SCHEME"], (d) => { d.objects.total.href = "javascript:alert(1)"; }],
  ["url-http", "Plain http links are refused.", ciml, ["E_URL_SCHEME"], (d) => { d.homepage = "http://example.com"; }],
  ["unknown-binding", "Actions must name a binding.", ciml, ["E_UNKNOWN_BINDING"], (d) => { d.objects.go.action.binding = "ghost"; }],
  ["unknown-data", "Values must name a data entry.", ciml, ["E_UNKNOWN_DATA"], (d) => { d.objects.total.value.data = "ghost"; }],
  ["unknown-field", "Inputs must name a field object.", ciml, ["E_UNKNOWN_FIELD"], (d) => { d.objects.go.action.inputs.to = { field: "total" }; }],
  ["unknown-context", "Only listed context values exist.", ciml, ["E_UNKNOWN_CONTEXT"], (d) => { d.objects.go.action.inputs.to = { context: "wallet.privateKey" }; }],
  ["amount-no-decimals", "An amount without decimals is ambiguous.", ciml, ["E_OBJECT_SHAPE"], (d) => { delete d.objects.amount.field.decimals; }],
  ["duplicate-field", "Field names are unique.", ciml, ["E_DUPLICATE_FIELD"], (d) => { d.objects.amount.field.name = "to"; }],
  ["extension-fallback", "Extensions need a fallback.", ciml, ["E_EXTENSION_FALLBACK"], (d) => { d.objects.total = { type: "extension", purpose: "x", accessibility: { label: "x" } }; d.data = {}; }],
  ["digest-wrong", "The digest must match the content.", ciml, ["E_DIGEST"], (d) => { d.integrity = { digest: `sha256:${"0".repeat(64)}` }; }],
  ["abi-function", "The function must be in the ABI.", ciml, ["E_ABI_FUNCTION"], (d) => { d.objects.go.action.operation = "drain"; }],
  ["abi-overload", "An overloaded name needs the full signature.", ciml, ["E_ABI_OVERLOAD"], (d) => { d.data.total.operation = "pick"; }],
  ["abi-effect-write", "A write cannot claim to be a read.", ciml, ["E_ABI_EFFECT"], (d) => { d.objects.go.action.effect = "read"; }],
  ["abi-effect-data", "Data loads cannot change state.", ciml, ["E_ABI_EFFECT", "E_ABI_INPUT_MISSING"], (d) => { d.data.total.operation = "send"; }],
  ["abi-value", "Only payable functions take native coin.", ciml, ["E_ABI_VALUE"], (d) => { d.objects.go.action.value = { literal: "1" }; }],
  ["abi-input-missing", "Every ABI input needs a source.", ciml, ["E_ABI_INPUT_MISSING"], (d) => { delete d.objects.go.action.inputs.amount; }],
  ["abi-input-unknown", "Inputs must exist in the ABI.", ciml, ["E_ABI_INPUT_UNKNOWN"], (d) => { d.objects.go.action.inputs.extra = { literal: "1" }; }],
  ["abi-type-field", "The field type must fit the ABI type.", ciml, ["E_ABI_TYPE"], (d) => { d.objects.to.field.inputType = "boolean"; }],
  ["abi-type-literal", "A literal must fit the ABI type.", ciml, ["E_ABI_TYPE"], (d) => { d.objects.go.action.inputs.amount = { literal: "lots" }; }],
  ["checksum-binding", "A binding address needs an EIP-55 checksum.", ciml, ["E_CHECKSUM"], (d) => { d.bindings.c.address = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"; }],
  ["checksum-literal", "A literal address with a bad checksum is refused.", ciml, ["E_CHECKSUM", "E_ABI_TYPE"], (d) => { d.objects.go.action.inputs.to = { literal: "0xA0B86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }; }],
  ["openapi-operation", "The operation must be in the spec.", iml, ["E_OPENAPI_OPERATION"], (d) => { d.objects.go.action.operation = "ghost"; }],
  ["openapi-input-missing", "Required parameters need a source.", iml, ["E_OPENAPI_INPUT"], (d) => { d.objects.go.action.inputs = {}; }],
  ["openapi-input-unknown", "Inputs must exist in the spec.", iml, ["E_OPENAPI_INPUT"], (d) => { d.objects.go.action.inputs.extra = { literal: "1" }; }],
  ["openapi-auth-header", "Documents cannot set credentials.", iml, ["E_OPENAPI_INPUT"], (d) => { d.objects.go.action = { binding: "a", operation: "getSecure", effect: "read", inputs: { Authorization: { literal: "Bearer stolen" } } }; }],
  ["openapi-effect", "A DELETE cannot claim to be a read.", iml, ["E_OPENAPI_EFFECT"], (d) => { d.objects.go.action.effect = "read"; }],
  ["openapi-spec", "Only OpenAPI 3.x.", iml, ["E_OPENAPI_SPEC"], (d) => { d.bindings.a.spec.inline.openapi = "2.0"; }],
  ["server-http", "Servers must use https.", iml, ["E_SERVER_URL"], (d) => { d.bindings.a.server = "http://api.example.com"; }],
  ["server-credentials", "A server URL cannot hold credentials.", iml, ["E_SERVER_URL"], (d) => { d.bindings.a.server = "https://user:pw@api.example.com"; }],
  ["server-not-listed", "The server must be one the spec lists.", iml, ["E_SERVER_URL"], (d) => { d.bindings.a.server = "https://evil.example.net"; }],
];

const write = (path: string, value: unknown): void => {
  writeFileSync(new URL(path, root), `${JSON.stringify(value, null, 2)}\n`);
};

rmSync(new URL("invalid/", root), { recursive: true, force: true });
rmSync(new URL("valid/", root), { recursive: true, force: true });
mkdirSync(new URL("invalid/", root), { recursive: true });
mkdirSync(new URL("valid/", root), { recursive: true });

for (const [name, description, base, expect, mutate] of invalid) {
  const document = clone(base);
  mutate(document);
  write(`invalid/${name}.json`, { description, expect, document });
}

const sealed = withDigest(clone(ciml) as unknown as InterfaceDocument);
write("valid/contract.json", { description: "A small contract interface.", document: ciml });
write("valid/contract-sealed.json", { description: "The same, with its digest.", document: sealed });
write("valid/api.json", { description: "A small API interface.", document: iml });
const shadow = clone(ciml);
shadow.objects.script = { type: "text", purpose: "Named like a keyword", accessibility: { label: "Script" }, text: "x" };
shadow.objects.root.children.push("script");
write("valid/author-names.json", { description: "Keywords are only refused as format keys, not as names an author chose.", document: shadow });
const fallback = clone(ciml);
fallback.objects.fancy = {
  type: "extension",
  purpose: "A custom widget",
  accessibility: { label: "Fancy" },
  extension: { id: "example.fancy", version: "1.0.0", fallback: "plain" },
};
fallback.objects.plain = { type: "text", purpose: "Fallback", accessibility: { label: "Plain" }, text: "Plain" };
fallback.objects.root.children.push("fancy");
write("valid/extension.json", { description: "An extension with a fallback.", document: fallback });
for (const name of ["erc20.ciml.json", "xdc-treasury.ciml.json", "weather.iml.json"]) {
  write(`valid/example-${name}`, { description: `The ${name} example.`, document: load(name) });
}

write("canonical.json", {
  description: "RFC 8785 cases. input is JSON text, expected is the exact canonical output.",
  cases: [
    {
      name: "rfc8785-example",
      input: '{"numbers":[333333333.33333329,1E30,4.50,2e-3,0.000000000000000000000000001],"string":"\\u20ac$\\u000F\\u000aA\'\\u0042\\u0022\\u005c\\\\\\"\\/","literals":[null,true,false]}',
      expected: '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}',
    },
    {
      name: "rfc8785-sorting",
      input: '{"\\u20ac":"Euro Sign","\\r":"Carriage Return","\\ufb33":"Hebrew Letter Dalet With Dagesh","1":"One","\\ud83d\\ude00":"Emoji: Grinning Face","\\u0080":"Control","\\u00f6":"Latin Small Letter O With Diaeresis"}',
      expected: '{"\\r":"Carriage Return","1":"One","\u0080":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}',
    },
    { name: "nesting", input: '{"b":[{"d":1,"c":2}],"a":{}}', expected: '{"a":{},"b":[{"c":2,"d":1}]}' },
    { name: "numbers", input: "[0,-0,1.0,1e21,1e-7,100]", expected: "[0,0,1,1e+21,1e-7,100]" },
  ],
});
void documentSchema;
