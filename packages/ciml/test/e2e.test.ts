/** Real contracts on a real local chain. Skipped when Foundry is not installed. */
import { execFileSync, spawn, type ChildProcess, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPublicClient, encodeDeployData, http, keccak256, type PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { signingMessage, withDigest } from "@ciml/core";
import { EvmRuntime, fromAbi, validateCiml, verifyCiml, type WalletProvider } from "@ciml/evm";

const toolPath = (name: string): string | undefined => {
  for (const candidate of [name, join(homedir(), ".foundry", "bin", name)]) {
    if (spawnSync(candidate, ["--version"]).status === 0) return candidate;
  }
  return undefined;
};
const anvil = toolPath("anvil");
const forge = toolPath("forge");
const contracts = new URL("../../../examples/contracts/", import.meta.url).pathname;
const PORT = 18545 + (process.pid % 1000);
const RPC = `http://127.0.0.1:${PORT}`;
const CHAIN = 31337;
// Anvil's public default accounts.
const signer = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const OTHER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

async function rpc(method: string, params: unknown[] = []): Promise<any> {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = (await response.json()) as { result?: unknown; error?: { message: string; data?: unknown; code: number } };
  if (body.error) throw Object.assign(new Error(body.error.message), body.error);
  return body.result;
}

const provider = (overrides: Record<string, () => unknown> = {}): WalletProvider => ({
  request: ((args: { method: string; params?: unknown[] }) =>
    overrides[args.method] ? Promise.resolve(overrides[args.method]?.()) : rpc(args.method, args.params ?? [])) as never,
});

/** Anvil mines at once, but the receipt can take a moment to be readable. */
async function waitForReceipt(hash: string): Promise<any> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const receipt = await rpc("eth_getTransactionReceipt", [hash]);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`no receipt for ${hash}`);
}

function artifact(name: string): { abi: Record<string, unknown>[]; bytecode: `0x${string}` } {
  const file = JSON.parse(readFileSync(join(contracts, "out", `${name}.sol`, `${name}.json`), "utf8"));
  return { abi: file.abi, bytecode: file.bytecode.object };
}

async function deploy(name: string, args: unknown[] = []): Promise<`0x${string}`> {
  const { abi, bytecode } = artifact(name);
  const data = encodeDeployData({ abi: abi as never, bytecode, args: args as never });
  const hash = await rpc("eth_sendTransaction", [{ from: signer.address, data }]);
  const receipt = await waitForReceipt(hash);
  expect(receipt.status).toBe("0x1");
  return receipt.contractAddress;
}

describe.skipIf(!anvil || !forge)("end to end on a local chain", () => {
  let chain: ChildProcess;
  let token: `0x${string}`;
  let client: PublicClient;
  const document = () =>
    fromAbi({ abi: artifact("DemoToken").abi, chainId: CHAIN, address: token, id: "e2e.token", title: "Demo", tokenDecimals: 18 });
  const actionOf = (doc: ReturnType<typeof document>, id: string) => {
    const found = doc.objects[id]?.action;
    if (!found) throw new Error(`no action ${id}`);
    return found;
  };

  beforeAll(async () => {
    execFileSync(forge as string, ["build", "--root", contracts], { stdio: "ignore" });
    chain = spawn(anvil as string, ["--port", String(PORT), "--silent"], { stdio: "ignore" });
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        await rpc("eth_chainId");
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    client = createPublicClient({ transport: http(RPC) }) as PublicClient;
    token = await deploy("DemoToken");
    const doc = document();
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    await runtime.refresh();
    const intent = await runtime.prepare(actionOf(doc, "mint.submit"), { to: signer.address, value: "100" });
    const { id } = await runtime.execute(intent);
    await waitForReceipt(id as string);
  }, 120_000);

  afterAll(() => {
    chain?.kill();
  });

  it("generates a valid document from the compiled ABI", () => {
    expect(validateCiml(document()).issues).toEqual([]);
  });

  it("reads live values, including through a read-only RPC without a wallet", async () => {
    const doc = document();
    const viaWallet = new EvmRuntime({ document: doc, provider: provider() });
    expect(await viaWallet.read(doc.data?.d_name as never, {})).toBe("Demo Token");
    expect(await viaWallet.read(doc.data?.d_totalsupply as never, {})).toBe((100n * 10n ** 18n).toString());
    const viaRpc = new EvmRuntime({ document: doc, rpc: { [CHAIN]: RPC } });
    expect(await viaRpc.read(doc.data?.d_decimals as never, {})).toBe(18);
  });

  it("returns several outputs by name and by index, and applies select", async () => {
    const doc = document();
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    const data = { binding: "contract", operation: "holdings", inputs: { account: { literal: signer.address } } };
    const inputs = { account: signer.address };
    const whole = (await runtime.read(data, inputs)) as Record<string, string>;
    expect(whole.balance).toBe(whole[0]);
    expect(await runtime.read({ ...data, select: "/total" }, inputs)).toBe((100n * 10n ** 18n).toString());
  });

  it("performs a read action through prepare and execute", async () => {
    const doc = document();
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    const intent = await runtime.prepare(actionOf(doc, "balanceof.submit"), { arg0: signer.address });
    expect(intent.effect).toBe("read");
    expect((await runtime.execute(intent)).result).toBe((100n * 10n ** 18n).toString());
  });

  it("sends a real transfer and changes on-chain state", async () => {
    const doc = document();
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    const before = await runtime.read({ binding: "contract", operation: "balanceOf", inputs: { arg0: { literal: OTHER } } }, { arg0: OTHER });
    const intent = await runtime.prepare(actionOf(doc, "transfer.submit"), { to: OTHER, value: "1.5" });
    expect(intent.blocked).toBe(false);
    expect(intent.warnings).toEqual([]);
    const { id } = await runtime.execute(intent);
    const receipt = await waitForReceipt(id as string);
    expect(receipt.status).toBe("0x1");
    const after = await runtime.read({ binding: "contract", operation: "balanceOf", inputs: { arg0: { literal: OTHER } } }, { arg0: OTHER });
    expect(BigInt(after as string) - BigInt(before as string)).toBe(15n * 10n ** 17n);
  });

  it("predicts a revert in the test run, without sending anything", async () => {
    const doc = document();
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    const nonceBefore = await rpc("eth_getTransactionCount", [signer.address, "latest"]);
    const intent = await runtime.prepare(actionOf(doc, "transfer.submit"), { to: OTHER, value: "999999" });
    expect(intent.warnings.map((warning) => warning.code)).toContain("W_SIMULATION_REVERTED");
    expect(await rpc("eth_getTransactionCount", [signer.address, "latest"])).toBe(nonceBefore);
  });

  it("sends native coin with a payable call", async () => {
    const doc = document();
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    const intent = await runtime.prepare(actionOf(doc, "deposit.submit"), {}, "2");
    await waitForReceipt((await runtime.execute(intent)).id as string);
    expect(await runtime.read(doc.data?.d_deposits as never, {})).toBe((2n * 10n ** 18n).toString());
  });

  it("flags an unlimited approval made against the real contract", async () => {
    const doc = document();
    doc.objects["approve.value"] = { ...doc.objects["approve.value"], field: { name: "n", inputType: "number" } } as never;
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    const intent = await runtime.prepare(actionOf(doc, "approve.submit"), { spender: OTHER, value: (2n ** 256n - 1n).toString() });
    expect(intent.warnings.map((warning) => warning.code)).toEqual(["W_UNLIMITED_APPROVAL"]);
  });

  it("blocks a contract call when the wallet is on the wrong chain", async () => {
    const doc = document();
    const runtime = new EvmRuntime({ document: doc, provider: provider({ eth_chainId: () => "0x1" }) });
    const intent = await runtime.prepare(actionOf(doc, "transfer.submit"), { to: OTHER, value: "1" });
    expect(intent.blocked).toBe(true);
    await expect(runtime.execute(intent)).rejects.toThrow(/blocked/);
  });

  it("blocks a contract call when nothing is deployed there", async () => {
    const doc = fromAbi({ abi: artifact("DemoToken").abi, chainId: CHAIN, address: "0x0000000000000000000000000000000000000001", id: "e2e.none", title: "None", tokenDecimals: 18 });
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    const intent = await runtime.prepare(actionOf(doc, "transfer.submit"), { to: OTHER, value: "1" });
    expect(intent.warnings.map((warning) => warning.code)).toContain("W_NO_CODE");
  });

  it("checks the code hash against the deployed bytecode", async () => {
    const code = await rpc("eth_getCode", [token, "latest"]);
    const doc = document();
    (doc.bindings.contract as { codeHash?: string }).codeHash = keccak256(code);
    const clients = { [CHAIN]: client };
    expect((await verifyCiml(doc, { clients })).codeHashes[0]?.status).toBe("match");
    const runtime = new EvmRuntime({ document: doc, provider: provider() });
    expect((await runtime.prepare(actionOf(doc, "transfer.submit"), { to: OTHER, value: "1" })).blocked).toBe(false);

    (doc.bindings.contract as { codeHash?: string }).codeHash = keccak256("0x00");
    expect((await verifyCiml(doc, { clients })).codeHashes[0]?.status).toBe("mismatch");
    const changed = await runtime.prepare(actionOf(doc, "transfer.submit"), { to: OTHER, value: "1" });
    expect(changed.warnings.map((warning) => warning.code)).toContain("W_CODE_HASH_MISMATCH");
  });

  it("verifies ERC-1271 signatures through a deployed contract wallet", async () => {
    const wallet = await deploy("SmartWallet", [signer.address]);
    const sealed = withDigest(document());
    const digest = sealed.integrity?.digest as string;
    const signature = await signer.signMessage({ message: signingMessage(digest) });
    sealed.integrity = { digest, signatures: [{ kind: "erc1271", signer: wallet, signature, chainId: CHAIN }] };
    const accepted = await verifyCiml(sealed, { clients: { [CHAIN]: client } });
    expect(accepted.level).toBe("signed");

    // Anvil's second default key, which the wallet does not accept.
    const foreign = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    sealed.integrity.signatures = [
      { kind: "erc1271", signer: wallet, signature: await foreign.signMessage({ message: signingMessage(digest) }), chainId: CHAIN },
    ];
    const rejected = await verifyCiml(sealed, { clients: { [CHAIN]: client } });
    expect(rejected.level).toBe("digest-valid");
    expect(rejected.signatures[0]?.valid).toBe(false);
  });
});
