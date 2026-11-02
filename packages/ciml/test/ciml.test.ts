import { readdirSync, readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { computeDigest, type InterfaceDocument, signingMessage, withDigest } from "@ciml/core";
import { EvmRuntime, fromAbi, migrateV1, to7730, validateCiml, verifyCiml, type WalletProvider } from "@ciml/evm";

const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const OTHER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
// Anvil's first default key: public, and used only in tests.
const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

const abi = [
  { type: "function", name: "total", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "setApprovalForAll", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }], outputs: [] },
  { type: "function", name: "fund", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "pick", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "pick", stateMutability: "view", inputs: [{ name: "name", type: "string" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "unnamed", stateMutability: "pure", inputs: [{ name: "", type: "uint256" }, { name: "", type: "bool" }], outputs: [{ name: "a", type: "uint256" }, { name: "", type: "bool" }] },
  { type: "function", name: "structured", stateMutability: "nonpayable", inputs: [{ name: "items", type: "uint256[2]" }, { name: "point", type: "tuple", components: [{ name: "x", type: "uint8" }, { name: "who", type: "address" }] }], outputs: [] },
] as Record<string, unknown>[];

const generated = (): InterfaceDocument =>
  fromAbi({ abi, chainId: 1, address: TOKEN, id: "test.doc", title: "Test", tokenDecimals: 6 });

/** A wallet double. Only it records what would have reached a real wallet. */
function fakeWallet(overrides: Record<string, (params?: unknown) => unknown> = {}) {
  const requests: { method: string; params?: unknown }[] = [];
  const provider: WalletProvider = {
    request: (async (args: { method: string; params?: unknown }) => {
      requests.push(args);
      const handler = overrides[args.method];
      if (handler) return handler(args.params);
      switch (args.method) {
        case "eth_accounts":
        case "eth_requestAccounts":
          return [account.address.toLowerCase()];
        case "eth_chainId":
          return "0x1";
        case "eth_getCode":
          return "0x6000";
        case "eth_call":
          return "0x";
        case "eth_sendTransaction":
          return "0xhash";
        default:
          throw new Error(`unexpected ${args.method}`);
      }
    }) as never,
  };
  return { provider, requests };
}

const action = (doc: InterfaceDocument, id: string) => {
  const found = doc.objects[id]?.action;
  if (!found) throw new Error(`no action ${id}`);
  return found;
};

describe("fromAbi", () => {
  it("generates a document that passes every check", () => {
    expect(validateCiml(generated()).issues).toEqual([]);
  });
  it("uses full signatures for overloads and keeps ids unique", () => {
    const doc = generated();
    const operations = Object.values(doc.objects).flatMap((object) => (object.action ? [object.action.operation] : []));
    expect(operations).toContain("pick(uint256)");
    expect(operations).toContain("pick(string)");
  });
  it("names unnamed inputs by position", () => {
    expect(Object.keys(action(generated(), "unnamed.submit").inputs ?? {})).toEqual(["arg0", "arg1"]);
  });
  it("gives payable functions a value field", () => {
    const fund = action(generated(), "fund.submit");
    expect(fund.value).toEqual({ field: "fund.value" });
  });
  it("applies token decimals only to amount-like names", () => {
    const doc = generated();
    expect(doc.objects["transfer.amount"]?.field).toMatchObject({ inputType: "amount", decimals: 6 });
    expect(doc.objects["pick.id"]?.field?.inputType).toBe("number");
  });
  it("checksums the address", () => {
    const doc = fromAbi({ abi, chainId: 1, address: TOKEN.toLowerCase(), id: "t", title: "T" });
    expect(doc.bindings.contract).toMatchObject({ address: TOKEN });
  });
});

describe("to7730", () => {
  const schema = JSON.parse(readFileSync(new URL("../../../spec/third_party/erc7730-v2.schema.json", import.meta.url), "utf8"));
  const validate = new Ajv2020({ allErrors: true, strict: false, validateFormats: false }).compile(schema);

  it("exports a descriptor that the ERC-7730 v2 schema accepts", () => {
    const descriptor = to7730(generated());
    expect(validate(descriptor), JSON.stringify(validate.errors)).toBe(true);
  });
  it.each(["erc20.ciml.json", "xdc-treasury.ciml.json"])("exports %s", (name) => {
    const doc = JSON.parse(readFileSync(new URL(`../../../examples/documents/${name}`, import.meta.url), "utf8"));
    expect(validate(to7730(doc)), JSON.stringify(validate.errors)).toBe(true);
  });
  it("includes writes with named signatures and leaves out reads", () => {
    const formats = (to7730(generated()) as any).display.formats;
    expect(formats["transfer(address to,uint256 amount)"].fields).toEqual([
      { path: "to", label: "To", format: "addressName" },
      { path: "amount", label: "Amount", format: "tokenAmount", params: { tokenPath: "@.to" } },
    ]);
    expect(Object.keys(formats).some((key) => key.startsWith("total") || key.startsWith("pick"))).toBe(false);
  });
  it("needs a binding name when there are several", () => {
    const doc = generated();
    doc.bindings.second = { ...(doc.bindings.contract as any) };
    expect(() => to7730(doc)).toThrow(/choose a binding/);
    expect(to7730(doc, { binding: "second" })).toBeTruthy();
  });
});

describe("migrateV1", () => {
  const directory = new URL("../../../legacy/v1-spec/examples/", import.meta.url);
  const files = readdirSync(directory).filter((name) => name.endsWith(".json"));
  const load = (name: string) => JSON.parse(readFileSync(new URL(name, directory), "utf8"));

  it("finds the five legacy examples", () => expect(files).toHaveLength(5));

  it.each(files)("migrates %s to a valid document and reports the losses", (name) => {
    const { document, report } = migrateV1(load(name));
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
    expect(validateCiml(document).issues).toEqual([]);
    expect(document?.bindings.contract).toMatchObject({ chainId: 50, address: "0x9D5B39393F30e2D1716756F3dcBb73c4cd1481C6" });
    const dropped = report.dropped.map((item) => item.path);
    expect(dropped).toContain("byteCode");
    expect(dropped).toContain("websitelink");
    expect(dropped).toContain("variables");
  });

  it("keeps the button's function and input, and follows the ABI's effect", () => {
    const { document, report } = migrateV1(load("Example-1.json"));
    expect(document?.objects.button1?.action).toMatchObject({
      operation: "writeString",
      effect: "read",
      inputs: { _string: { field: "textfield1" } },
    });
    expect(document?.objects.text1?.value).toEqual({ data: "d_read" });
    // The example's ABI marks writeString as view, whatever v1 called it.
    expect(report.warnings.some((item) => item.message.includes("v1 called this a write"))).toBe(true);
  });

  it("makes a write when the ABI says the function changes state", () => {
    const source = load("Example-1.json");
    source[0].abi = source[0].abi.replace(/@stateMutability@:@view@,@type@:@function@/g, "@stateMutability@:@nonpayable@,@type@:@function@");
    const parsed = JSON.parse(source[0].abi.replace(/@/g, '"'));
    source[0].abi = parsed.map((item: any) => (item.name === "read" ? { ...item, stateMutability: "view" } : item));
    const { document, report } = migrateV1(source);
    expect(document?.objects.button1?.action).toMatchObject({ effect: "write", confirm: { title: "write" } });
    expect(validateCiml(document).issues).toEqual([]);
    expect(report.warnings.some((item) => item.message.includes("v1 called this a write"))).toBe(false);
  });

  it("does not carry over a button that secretly sends coin, and calls it out", () => {
    const { document, report } = migrateV1(load("Example-1.json"));
    expect(document?.objects.button2?.type).toBe("text");
    expect(document?.objects.button2?.action).toBeUndefined();
    const note = report.dropped.find((item) => item.path === "objects/button2");
    expect(note?.message).toContain("next page");
    expect(note?.message).toContain("1000000000000000000");
    expect(note?.message).toContain("0x6FfB1b55C080aF7057c9E3390CEb54A94d55B4bf");
  });

  it("turns a button with other client-side behaviour into text, and says so", () => {
    const { document, report } = migrateV1(load("Example-3.json"));
    expect(document?.objects.button1?.type).toBe("text");
    expect(report.dropped.find((item) => item.path === "objects/button1")?.message).toContain("var-text1");
  });

  it("reports a fixed input where v1 passed text instead of a field", () => {
    const { document, report } = migrateV1(load("Example-5.json"));
    expect(document?.objects.button1?.action?.inputs).toEqual({ _string: { literal: " This is Test1 text " } });
    expect(report.warnings.some((item) => item.message.includes("fixed value"))).toBe(true);
  });

  it("refuses an unknown network rather than guessing", () => {
    const source = load("Example-1.json");
    source[0].networks = ["Atlantis"];
    const { document, report } = migrateV1(source);
    expect(document).toBeUndefined();
    expect(report.errors[0]?.path).toBe("networks");
  });

  it("accepts the xdc address prefix", () => {
    const source = load("Example-1.json");
    source[0].contractMainnet = "xdc9D5B39393F30e2D1716756F3dcBb73c4cd1481C6";
    expect(migrateV1(source).document?.bindings.contract).toMatchObject({ address: "0x9D5B39393F30e2D1716756F3dcBb73c4cd1481C6" });
  });

  it.each([[null], ["text"], [[]], [{}]])("reports errors for %j", (input) => {
    expect(migrateV1(input).report.ok).toBe(false);
  });
});

describe("verifyCiml", () => {
  const signed = async (doc: InterfaceDocument) => {
    const sealed = withDigest(doc);
    const digest = sealed.integrity?.digest as string;
    return { sealed, digest, signature: await account.signMessage({ message: signingMessage(digest) }) };
  };

  it("reports unverified with no integrity block", async () => {
    expect((await verifyCiml(generated())).level).toBe("unverified");
  });
  it("reports digest-valid for an intact, unsigned document", async () => {
    expect((await verifyCiml(withDigest(generated()))).level).toBe("digest-valid");
  });
  it("reports digest-invalid when the content changed", async () => {
    const sealed = withDigest(generated());
    sealed.title = "Changed";
    const report = await verifyCiml(sealed);
    expect(report.level).toBe("digest-invalid");
  });
  it("reports signed for a good signature", async () => {
    const { sealed, digest, signature } = await signed(generated());
    sealed.integrity = { digest, signatures: [{ kind: "eip191", signer: account.address, signature }] };
    const report = await verifyCiml(sealed);
    expect(report.level).toBe("signed");
    expect(report.signatures[0]).toMatchObject({ valid: true, signer: account.address });
  });
  it("does not accept a signature by someone other than the named signer", async () => {
    const { sealed, digest, signature } = await signed(generated());
    sealed.integrity = { digest, signatures: [{ kind: "eip191", signer: OTHER, signature }] };
    const report = await verifyCiml(sealed);
    expect(report.level).toBe("digest-valid");
    expect(report.signatures[0]?.valid).toBe(false);
  });
  it("does not accept a signature over different content", async () => {
    const { signature } = await signed(generated());
    const other = generated();
    other.title = "Other";
    const sealed = withDigest(other);
    sealed.integrity = { digest: computeDigest(other as never), signatures: [{ kind: "eip191", signer: account.address, signature }] };
    expect((await verifyCiml(sealed)).level).toBe("digest-valid");
  });
  it("does not trust a malformed signature", async () => {
    const sealed = withDigest(generated());
    sealed.integrity = { digest: sealed.integrity?.digest as string, signatures: [{ kind: "eip191", signer: account.address, signature: "0xdead" }] };
    expect((await verifyCiml(sealed)).signatures[0]?.valid).toBe(false);
  });
  it("cannot accept ERC-1271 without a client", async () => {
    const sealed = withDigest(generated());
    sealed.integrity = { digest: sealed.integrity?.digest as string, signatures: [{ kind: "erc1271", signer: OTHER, signature: "0xdead", chainId: 1 }] };
    const report = await verifyCiml(sealed);
    expect(report.level).toBe("digest-valid");
    expect(report.signatures[0]?.reason).toMatch(/no client/);
  });
  it("reports code hashes as absent or unchecked without a client", async () => {
    const doc = generated();
    expect((await verifyCiml(doc)).codeHashes).toEqual([{ binding: "contract", status: "absent" }]);
    (doc.bindings.contract as any).codeHash = `0x${"0".repeat(64)}`;
    expect((await verifyCiml(doc)).codeHashes).toEqual([{ binding: "contract", status: "unchecked" }]);
  });
});

describe("EvmRuntime.prepare", () => {
  const prepare = async (id: string, inputs: Record<string, unknown>, overrides = {}, value?: unknown) => {
    const doc = generated();
    const wallet = fakeWallet(overrides);
    const runtime = new EvmRuntime({ document: doc, provider: wallet.provider });
    const intent = await runtime.prepare(action(doc, id), inputs, value);
    return { intent, wallet, runtime };
  };
  const send = wallet => wallet.requests.filter((request: { method: string }) => request.method === "eth_sendTransaction");

  it("decodes amounts using the field's decimals", async () => {
    const { intent } = await prepare("transfer.submit", { to: OTHER, amount: "1.5" });
    expect(intent.inputs).toEqual([
      { name: "to", type: "address", value: OTHER },
      { name: "amount", type: "uint256", value: "1.5 (1500000 base units)" },
    ]);
    expect(intent.blocked).toBe(false);
    expect(intent.operation).toBe("transfer(address,uint256)");
  });
  it("sends nothing while preparing", async () => {
    const { wallet } = await prepare("transfer.submit", { to: OTHER, amount: "1" });
    expect(send(wallet)).toEqual([]);
  });
  it("blocks when the wallet is on another chain, before any contract call", async () => {
    const { intent, wallet } = await prepare("transfer.submit", { to: OTHER, amount: "1" }, { eth_chainId: () => "0x32" });
    expect(intent.blocked).toBe(true);
    expect(intent.warnings.map((warning) => warning.code)).toContain("W_CHAIN_MISMATCH");
    expect(wallet.requests.some((request) => request.method === "eth_call")).toBe(false);
  });
  it("blocks when no account is connected", async () => {
    const { intent } = await prepare("transfer.submit", { to: OTHER, amount: "1" }, { eth_accounts: () => [] });
    expect(intent.blocked).toBe(true);
    expect(intent.warnings.map((warning) => warning.code)).toContain("W_NO_WALLET");
  });
  it("blocks when there is no contract at the address", async () => {
    const { intent } = await prepare("transfer.submit", { to: OTHER, amount: "1" }, { eth_getCode: () => "0x" });
    expect(intent.blocked).toBe(true);
    expect(intent.warnings.map((warning) => warning.code)).toContain("W_NO_CODE");
  });
  it("blocks when the deployed code differs from the document's code hash", async () => {
    const doc = generated();
    (doc.bindings.contract as any).codeHash = `0x${"a".repeat(64)}`;
    const runtime = new EvmRuntime({ document: doc, provider: fakeWallet().provider });
    const intent = await runtime.prepare(action(doc, "transfer.submit"), { to: OTHER, amount: "1" });
    expect(intent.blocked).toBe(true);
    expect(intent.warnings.map((warning) => warning.code)).toContain("W_CODE_HASH_MISMATCH");
  });
  it("warns when the test run reverts", async () => {
    const { intent } = await prepare("transfer.submit", { to: OTHER, amount: "1" }, {
      eth_call: () => {
        throw new Error("execution reverted");
      },
    });
    expect(intent.warnings.map((warning) => warning.code)).toContain("W_SIMULATION_REVERTED");
  });
  it("flags unlimited approvals", async () => {
    const max = (2n ** 256n - 1n).toString();
    const doc = generated();
    doc.objects["approve.amount"] = { ...doc.objects["approve.amount"], field: { name: "x", inputType: "number" } } as any;
    const runtime = new EvmRuntime({ document: doc, provider: fakeWallet().provider });
    const flagged = await runtime.prepare(action(doc, "approve.submit"), { spender: OTHER, amount: max });
    expect(flagged.warnings.map((warning) => warning.code)).toContain("W_UNLIMITED_APPROVAL");
    const small = await runtime.prepare(action(doc, "approve.submit"), { spender: OTHER, amount: "5" });
    expect(small.warnings).toEqual([]);
  });
  it("flags approval of a whole collection, not its revocation", async () => {
    const granted = await prepare("setapprovalforall.submit", { operator: OTHER, approved: true });
    expect(granted.intent.warnings.map((warning) => warning.code)).toContain("W_APPROVAL_FOR_ALL");
    const revoked = await prepare("setapprovalforall.submit", { operator: OTHER, approved: false });
    expect(revoked.intent.warnings).toEqual([]);
  });
  it("converts native value using the field's decimals and warns", async () => {
    const { intent } = await prepare("fund.submit", {}, {}, "0.5");
    expect((intent.payload as any).value).toBe(`0x${(5n * 10n ** 17n).toString(16)}`);
    expect(intent.warnings.map((warning) => warning.code)).toContain("W_SENDS_NATIVE");
  });
  it.each([
    [{ to: "not-an-address", amount: "1" }, /to: not an address/],
    [{ to: "0xA0B86991c6218b36c1d19D4a2e9Eb0cE3606eB48", amount: "1" }, /bad checksum/],
    [{ to: OTHER, amount: "abc" }, /not a number/],
    [{ to: OTHER, amount: "1.1234567" }, /at most 6 decimal/],
    [{ to: OTHER, amount: "-1" }, /out of range/],
    [{ to: OTHER }, /amount: required/],
  ])("refuses bad input %j", async (inputs, message) => {
    await expect(prepare("transfer.submit", inputs)).rejects.toThrow(message);
  });
  it("accepts an all-lowercase address, which carries no checksum", async () => {
    const { intent } = await prepare("transfer.submit", { to: OTHER.toLowerCase(), amount: "1" });
    expect(intent.inputs[0]?.value).toBe(OTHER);
  });
  it("encodes fixed arrays and tuples from JSON, and checks them", async () => {
    const good = await prepare("structured.submit", { items: "[1,2]", point: `{"x":1,"who":"${OTHER}"}` });
    expect(good.intent.blocked).toBe(false);
    await expect(prepare("structured.submit", { items: "[1]", point: `{"x":1,"who":"${OTHER}"}` })).rejects.toThrow(/expected 2 items/);
    await expect(prepare("structured.submit", { items: "[1,2]", point: `{"x":999,"who":"${OTHER}"}` })).rejects.toThrow(/out of range/);
    await expect(prepare("structured.submit", { items: "[1,2]", point: `{"x":1}` })).rejects.toThrow(/missing/);
  });
});

describe("EvmRuntime.execute", () => {
  it("refuses a blocked intent, without contacting the wallet", async () => {
    const doc = generated();
    const wallet = fakeWallet({ eth_chainId: () => "0x32" });
    const runtime = new EvmRuntime({ document: doc, provider: wallet.provider });
    const intent = await runtime.prepare(action(doc, "transfer.submit"), { to: OTHER, amount: "1" });
    await expect(runtime.execute(intent)).rejects.toThrow(/blocked/);
    expect(wallet.requests.some((request) => request.method === "eth_sendTransaction")).toBe(false);
  });
  it("refuses if the network changed after review", async () => {
    const doc = generated();
    let chain = "0x1";
    const wallet = fakeWallet({ eth_chainId: () => chain });
    const runtime = new EvmRuntime({ document: doc, provider: wallet.provider });
    const intent = await runtime.prepare(action(doc, "transfer.submit"), { to: OTHER, amount: "1" });
    chain = "0x32";
    await expect(runtime.execute(intent)).rejects.toThrow(/changed network/);
    expect(wallet.requests.some((request) => request.method === "eth_sendTransaction")).toBe(false);
  });
  it("refuses if the account changed after review", async () => {
    const doc = generated();
    let accounts = [account.address];
    const wallet = fakeWallet({ eth_accounts: () => accounts });
    const runtime = new EvmRuntime({ document: doc, provider: wallet.provider });
    const intent = await runtime.prepare(action(doc, "transfer.submit"), { to: OTHER, amount: "1" });
    accounts = [OTHER];
    await expect(runtime.execute(intent)).rejects.toThrow(/changed account/);
  });
  it("only ever asks the wallet to send a transaction, never to sign raw data", async () => {
    const doc = generated();
    const wallet = fakeWallet();
    const runtime = new EvmRuntime({ document: doc, provider: wallet.provider });
    const intent = await runtime.prepare(action(doc, "transfer.submit"), { to: OTHER, amount: "1" });
    expect(await runtime.execute(intent)).toEqual({ id: "0xhash" });
    const sign = wallet.requests.filter((request) => /sign/i.test(request.method));
    expect(sign).toEqual([]);
  });
});

describe("EvmRuntime reads", () => {
  it("refuses to read through a wallet on the wrong chain, which would show wrong data", async () => {
    const doc = generated();
    const wallet = fakeWallet({ eth_chainId: () => "0x32" });
    const runtime = new EvmRuntime({ document: doc, provider: wallet.provider });
    await expect(runtime.read(doc.data?.d_total as never, {})).rejects.toThrow(/chain/);
  });
  it("needs a wallet or an RPC endpoint", async () => {
    const doc = generated();
    const runtime = new EvmRuntime({ document: doc });
    await expect(runtime.read(doc.data?.d_total as never, {})).rejects.toThrow(/no wallet or RPC/);
  });
});
