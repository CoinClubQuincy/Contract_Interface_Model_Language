import {
  type AbiFunction,
  type Address,
  createPublicClient,
  custom,
  decodeFunctionResult,
  type EIP1193Provider,
  encodeFunctionData,
  getAddress,
  type Hex,
  http,
  keccak256,
  type PublicClient,
  parseUnits,
} from "viem";
import {
  type ActionBinding,
  type DataBinding,
  type EvmBinding,
  type HostContext,
  type InputSource,
  type Intent,
  InterfaceError,
  type InterfaceDocument,
  type InterfaceRuntime,
  readPointer,
} from "@ciml/core";
import { coerceArgument, findFunction, inputName, normalizeResult } from "./abi.js";

const UNLIMITED = 1n << 255n;
const APPROVAL_FUNCTIONS = new Set(["approve", "increaseAllowance", "increaseApproval"]);
const NATIVE_DECIMALS = 18;

/** The part of EIP-1193 this runtime uses. It never asks a wallet to sign raw data. */
export type WalletProvider = Pick<EIP1193Provider, "request"> & {
  on?: (event: never, listener: never) => unknown;
  removeListener?: (event: never, listener: never) => unknown;
};

export interface EvmRuntimeOptions {
  document: InterfaceDocument;
  /** An EIP-1193 provider, usually from discoverWallets. */
  provider?: WalletProvider;
  /** Read-only RPC endpoints by chain ID, so data loads without a wallet or on another network. */
  rpc?: Record<number, string>;
}

export interface EvmPayload {
  chainId: number;
  from?: Address;
  to: Address;
  data: Hex;
  value: Hex;
  item: AbiFunction;
}

export class EvmRuntime implements InterfaceRuntime {
  private readonly document: InterfaceDocument;
  private readonly provider?: WalletProvider;
  private readonly rpc: Record<number, string>;
  private readonly rpcClients = new Map<number, PublicClient>();
  private address?: Address;
  private chainId?: number;

  constructor(options: EvmRuntimeOptions) {
    this.document = options.document;
    this.provider = options.provider;
    this.rpc = options.rpc ?? {};
  }

  context(): HostContext {
    return { "wallet.address": this.address, "wallet.chainId": this.chainId };
  }

  /** Read the wallet's current state without prompting the user. */
  async refresh(): Promise<void> {
    if (!this.provider) return;
    const accounts = (await this.provider.request({ method: "eth_accounts" })) as string[];
    const chain = (await this.provider.request({ method: "eth_chainId" })) as string;
    const [first] = accounts;
    this.address = first ? getAddress(first) : undefined;
    this.chainId = Number(chain);
  }

  async connect(): Promise<void> {
    if (!this.provider) throw new InterfaceError("E_NO_WALLET", "no wallet is available");
    await this.provider.request({ method: "eth_requestAccounts" });
    await this.refresh();
  }

  /** Ask the wallet to change network. The wallet shows its own prompt. */
  async switchChain(chainId: number): Promise<void> {
    if (!this.provider) throw new InterfaceError("E_NO_WALLET", "no wallet is available");
    await this.provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    await this.refresh();
  }

  subscribe(listener: () => void): () => void {
    const { provider } = this;
    if (!provider?.on) return () => undefined;
    const handler = (): void => {
      void this.refresh().then(listener);
    };
    provider.on("accountsChanged" as never, handler as never);
    provider.on("chainChanged" as never, handler as never);
    return () => {
      provider.removeListener?.("accountsChanged" as never, handler as never);
      provider.removeListener?.("chainChanged" as never, handler as never);
    };
  }

  private binding(name: string): EvmBinding {
    const binding = this.document.bindings[name];
    if (binding?.kind !== "evm") {
      throw new InterfaceError("E_UNKNOWN_BINDING", `no contract binding "${name}"`);
    }
    return binding;
  }

  private item(binding: EvmBinding, operation: string): AbiFunction {
    const lookup = findFunction(binding.abi, operation);
    if (lookup.kind !== "found") {
      throw new InterfaceError("E_ABI_FUNCTION", `cannot call "${operation}" on this contract`);
    }
    return lookup.item;
  }

  /** A client that is certain to be on the binding's chain, or an error. */
  private async readClient(chainId: number): Promise<PublicClient> {
    const url = this.rpc[chainId];
    if (url) {
      let client = this.rpcClients.get(chainId);
      if (!client) {
        client = createPublicClient({ transport: http(url) }) as PublicClient;
        this.rpcClients.set(chainId, client);
      }
      return client;
    }
    if (!this.provider) {
      throw new InterfaceError("E_NO_WALLET", `no wallet or RPC endpoint for chain ${chainId}`);
    }
    await this.refresh();
    if (this.chainId !== chainId) {
      throw new InterfaceError(
        "E_CHAIN_MISMATCH",
        `the wallet is on chain ${this.chainId}, and this contract is on chain ${chainId}`,
      );
    }
    return createPublicClient({ transport: custom(this.provider as EIP1193Provider) }) as PublicClient;
  }

  private encodeArguments(
    item: AbiFunction,
    sources: Record<string, InputSource> | undefined,
    inputs: Record<string, unknown>,
  ): unknown[] {
    return (item.inputs ?? []).map((parameter, index) => {
      const name = inputName(parameter, index);
      const raw = inputs[name];
      if (raw === undefined) throw new InterfaceError("E_INPUT", `${name}: required`);
      const source = sources?.[name];
      const field =
        source && "field" in source ? this.document.objects[source.field]?.field : undefined;
      return coerceArgument(parameter, raw, name, field);
    });
  }

  private nativeValue(action: ActionBinding, value: unknown): bigint {
    if (value === undefined || value === "") return 0n;
    const source = action.value;
    const field = source && "field" in source ? this.document.objects[source.field]?.field : undefined;
    try {
      if (field?.inputType === "amount") {
        return parseUnits(String(value).trim(), field.decimals ?? NATIVE_DECIMALS);
      }
      return BigInt(String(value).trim());
    } catch {
      throw new InterfaceError("E_INPUT", "value: not a number");
    }
  }

  async read(data: DataBinding, inputs: Record<string, unknown>): Promise<unknown> {
    const binding = this.binding(data.binding);
    const item = this.item(binding, data.operation);
    const client = await this.readClient(binding.chainId);
    const result = await this.call(client, binding, item, this.encodeArguments(item, data.inputs, inputs));
    return readPointer(result, data.select);
  }

  private async call(
    client: PublicClient,
    binding: EvmBinding,
    item: AbiFunction,
    args: unknown[],
  ): Promise<unknown> {
    // Passing only the one function rules out picking the wrong overload.
    const encoded = encodeFunctionData({ abi: [item], args });
    const response = await client.call({
      account: this.address,
      to: binding.address as Address,
      data: encoded,
    });
    if (!response.data) {
      throw new InterfaceError("E_EMPTY_RESULT", "the call returned no data");
    }
    const decoded = decodeFunctionResult({ abi: [item], data: response.data });
    return normalizeResult(item, decoded);
  }

  /** Decode what an action will do and test it with eth_call. Nothing is sent. */
  async prepare(
    action: ActionBinding,
    inputs: Record<string, unknown>,
    value?: unknown,
  ): Promise<Intent> {
    const binding = this.binding(action.binding);
    const item = this.item(binding, action.operation);
    const args = this.encodeArguments(item, action.inputs, inputs);
    const wei = this.nativeValue(action, value);
    const warnings: Intent["warnings"] = [];
    let blocked = false;
    const block = (code: string, message: string): void => {
      warnings.push({ code, message });
      blocked = true;
    };

    if (this.provider) await this.refresh();
    if (action.effect === "write") {
      if (!this.provider || !this.address) block("W_NO_WALLET", "Connect a wallet first.");
      if (this.chainId !== binding.chainId) {
        block(
          "W_CHAIN_MISMATCH",
          `Your wallet is on chain ${this.chainId ?? "unknown"}. This contract is on chain ${binding.chainId}.`,
        );
      }
    }
    warnings.push(...approvalWarnings(item, args));
    if (wei > 0n) {
      warnings.push({ code: "W_SENDS_NATIVE", message: `Sends ${wei} wei of the native coin.` });
    }

    const data = encodeFunctionData({ abi: [item], args });
    const payload: EvmPayload = {
      chainId: binding.chainId,
      from: this.address,
      to: getAddress(binding.address),
      data,
      value: `0x${wei.toString(16)}`,
      item,
    };

    if (action.effect === "write" && !blocked) {
      const client = await this.readClient(binding.chainId);
      const code = await client.getCode({ address: payload.to });
      if (!code) {
        block("W_NO_CODE", "There is no contract at this address on this network.");
      } else if (binding.codeHash && keccak256(code) !== binding.codeHash.toLowerCase()) {
        block("W_CODE_HASH_MISMATCH", "The deployed code differs from what the document names.");
      } else {
        try {
          await client.call({ account: payload.from, to: payload.to, data, value: wei });
        } catch (error) {
          const detail = (error as { shortMessage?: string }).shortMessage;
          warnings.push({
            code: "W_SIMULATION_REVERTED",
            message: `A test run failed, so this will probably fail too: ${detail ?? "reverted"}`,
          });
        }
      }
    }

    return {
      title: action.confirm?.title ?? item.name,
      effect: action.effect,
      target: `${payload.to} on chain ${binding.chainId}`,
      operation: findFunctionSignature(binding, action.operation),
      inputs: (item.inputs ?? []).map((parameter, index) => {
        const name = inputName(parameter, index);
        const source = action.inputs?.[name];
        const field = source && "field" in source ? this.document.objects[source.field]?.field : undefined;
        const encoded = displayArgument(args[index]);
        return {
          name,
          type: parameter.type,
          // Show what the person typed beside what will be sent, so a wrong scale is visible.
          value: field?.inputType === "amount" ? `${String(inputs[name]).trim()} (${encoded} base units)` : encoded,
        };
      }),
      warnings,
      blocked,
      payload,
    };
  }

  /** Perform a prepared action. Writes go to the wallet, which signs and shows its own prompt. */
  async execute(intent: Intent): Promise<{ id?: string; result?: unknown }> {
    if (intent.blocked) throw new InterfaceError("E_BLOCKED", "this action is blocked");
    const payload = intent.payload as EvmPayload;
    if (intent.effect === "read") {
      const client = await this.readClient(payload.chainId);
      const response = await client.call({ account: payload.from, to: payload.to, data: payload.data });
      if (!response.data) throw new InterfaceError("E_EMPTY_RESULT", "the call returned no data");
      const decoded = decodeFunctionResult({ abi: [payload.item], data: response.data });
      return { result: normalizeResult(payload.item, decoded) };
    }
    if (!this.provider) throw new InterfaceError("E_NO_WALLET", "no wallet is available");
    // The user may have changed network or account while reading the dialog.
    await this.refresh();
    if (this.chainId !== payload.chainId) {
      throw new InterfaceError("E_CHAIN_MISMATCH", "the wallet changed network: prepare again");
    }
    if (this.address !== payload.from) {
      throw new InterfaceError("E_ACCOUNT_CHANGED", "the wallet changed account: prepare again");
    }
    const hash = (await this.provider.request({
      method: "eth_sendTransaction",
      params: [{ from: payload.from, to: payload.to, data: payload.data, value: payload.value }],
    } as never)) as string;
    return { id: hash };
  }
}

function findFunctionSignature(binding: EvmBinding, operation: string): string {
  const lookup = findFunction(binding.abi, operation);
  return lookup.kind === "found" ? lookup.signature : operation;
}

function displayArgument(value: unknown): string {
  if (typeof value === "string" || typeof value === "bigint") return String(value);
  return JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

function approvalWarnings(item: AbiFunction, args: unknown[]): Intent["warnings"] {
  if (item.name === "setApprovalForAll" && args[1] === true) {
    return [
      {
        code: "W_APPROVAL_FOR_ALL",
        message: `This lets ${String(args[0])} move every token you hold in this collection.`,
      },
    ];
  }
  if (APPROVAL_FUNCTIONS.has(item.name)) {
    const amount = args.find((arg): arg is bigint => typeof arg === "bigint");
    if (amount !== undefined && amount >= UNLIMITED) {
      return [
        {
          code: "W_UNLIMITED_APPROVAL",
          message: `This lets ${String(args[0])} spend an unlimited amount of this token.`,
        },
      ];
    }
  }
  return [];
}
