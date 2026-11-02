import type {
  FieldInputType,
  Modality,
  SchemaId,
  SemanticType,
  TokenGroup,
  ValueFormat,
} from "./vocabulary.js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Where an operation's input comes from. */
export type InputSource =
  | { field: string }
  | { context: string }
  | { literal: JsonValue };

export interface DataBinding {
  binding: string;
  operation: string;
  inputs?: Record<string, InputSource>;
  /** RFC 6901 JSON pointer into the result. */
  select?: string;
}

export interface ActionBinding {
  binding: string;
  operation: string;
  inputs?: Record<string, InputSource>;
  effect: "read" | "write";
  /** Native coin to send with a payable contract call. */
  value?: InputSource;
  confirm?: { title: string; body?: string };
}

export interface FieldSpec {
  name: string;
  inputType: FieldInputType;
  label?: string;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  decimals?: number;
  format?: "tokenAmount" | "addressName" | "date" | "raw";
}

export interface ValueSpec {
  data: string;
  format?: ValueFormat;
  decimals?: number;
}

export interface InterfaceObject {
  type: SemanticType;
  purpose: string;
  accessibility: { label: string; hint?: string };
  children?: string[];
  text?: string;
  value?: ValueSpec;
  field?: FieldSpec;
  action?: ActionBinding;
  src?: string;
  href?: string;
  trend?: "up" | "down" | "flat";
  modalities?: Modality[];
  presentation?: Record<string, string>;
  extension?: { id: string; version: string; fallback: string };
}

export interface EvmBinding {
  kind: "evm";
  chainId: number;
  address: string;
  abi: readonly Record<string, unknown>[];
  /** keccak256 of the deployed runtime code. Verified when a client is available. */
  codeHash?: string;
}

export interface OpenApiBinding {
  kind: "openapi";
  server: string;
  spec: { inline: Record<string, unknown> } | { url: string; digest: string };
}

export type Binding = EvmBinding | OpenApiBinding;

export interface DocumentSignature {
  kind: "eip191" | "erc1271";
  signer: string;
  signature: string;
  /** The chain to call for ERC-1271. */
  chainId?: number;
}

export interface Integrity {
  digest: string;
  signatures?: DocumentSignature[];
}

export interface InterfaceDocument {
  schema: SchemaId;
  id: string;
  version: string;
  title: string;
  description?: string;
  locale?: string;
  homepage?: string;
  icon?: string;
  tokens?: Partial<Record<TokenGroup, Record<string, string | number>>>;
  bindings: Record<string, Binding>;
  data?: Record<string, DataBinding>;
  root: string;
  objects: Record<string, InterfaceObject>;
  integrity?: Integrity;
}

export interface Issue {
  /** Stable, machine-readable code. The spec lists them all. */
  code: string;
  /** JSON pointer to the problem. */
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: Issue[];
}

/** Values the host supplies, which a document reads through { context }. */
export type HostContext = Record<string, string | number | undefined>;

/** A human-readable statement of exactly what an action will do. Shown before anything is sent. */
export interface Intent {
  title: string;
  effect: "read" | "write";
  target: string;
  operation: string;
  inputs: { name: string; type: string; value: string }[];
  warnings: { code: string; message: string }[];
  /** True when the action must not proceed, whatever the user chooses. */
  blocked: boolean;
  /** Implementation data the runtime needs to perform the action. */
  payload: unknown;
}

/** What a renderer needs. @ciml/evm and @ciml/openapi each provide one. */
export interface InterfaceRuntime {
  context(): HostContext;
  read(binding: DataBinding, inputs: Record<string, unknown>): Promise<unknown>;
  prepare(action: ActionBinding, inputs: Record<string, unknown>, value?: unknown): Promise<Intent>;
  execute(intent: Intent): Promise<{ id?: string; result?: unknown }>;
  /** Ask the host to connect a wallet or sign in. */
  connect?(): Promise<void>;
  /** Hear about account and network changes. Returns the unsubscribe function. */
  subscribe?(listener: () => void): () => void;
}
