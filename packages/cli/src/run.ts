import { readFile, writeFile } from "node:fs/promises";
import { createPublicClient, http, type PublicClient } from "viem";
import {
  computeDigest,
  type DocumentSignature,
  type InterfaceDocument,
  type ValidationResult,
  validateDocument,
  withDigest,
} from "@ciml/core";
import { fromAbi, migrateV1, to7730, validateCiml, verifyCiml } from "@ciml/evm";
import { fromOpenApi, validateIml, validateImlWithSpecs } from "@ciml/openapi";

const USAGE = `ciml: tools for CIML (smart contract) and IML (HTTP API) interface documents

  ciml validate <file> [--fetch-specs]    Check a document. --fetch-specs checks remote OpenAPI specs.
  ciml digest <file> [--write]            Print the digest, or write it into the file.
  ciml verify <file> [--rpc <chainId>=<url>]...
                                          Report digest, signatures and code hashes.
  ciml from-abi <abi.json> --chain-id <n> --address <0x..> --id <id> --title <text>
                [--token-decimals <n>] [-o <file>]
  ciml from-openapi <spec.json> --id <id> [--title <text>] [--server <url>] [-o <file>]
  ciml migrate <v1.json> [-o <file>]      Convert a CIML v1 document and report what was lost.
  ciml to-7730 <file> [--binding <name>] [--owner <text>] [-o <file>]
  ciml attach-signature <file> --signer <0x..> --signature <0x..> [--kind eip191|erc1271] [--chain-id <n>]

Exit codes: 0 success, 1 the document failed, 2 bad usage.`;

export interface Io {
  out: (text: string) => void;
  err: (text: string) => void;
}

interface Parsed {
  positional: string[];
  options: Map<string, string[]>;
}

const FLAGS = new Set(["write", "fetch-specs", "help", "json"]);

function parseArgs(argv: string[]): Parsed {
  const positional: string[] = [];
  const options = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] as string;
    if (arg === "-o") {
      options.set("output", [argv[(index += 1)] ?? ""]);
    } else if (arg.startsWith("--")) {
      const name = arg.slice(2);
      if (FLAGS.has(name)) {
        options.set(name, ["true"]);
      } else {
        const value = argv[(index += 1)];
        if (value === undefined) throw new UsageError(`--${name} needs a value`);
        options.set(name, [...(options.get(name) ?? []), value]);
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}

class UsageError extends Error {}

function required(parsed: Parsed, name: string): string {
  const value = parsed.options.get(name)?.[0];
  if (!value) throw new UsageError(`--${name} is required`);
  return value;
}

function optional(parsed: Parsed, name: string): string | undefined {
  return parsed.options.get(name)?.[0];
}

function fileArgument(parsed: Parsed): string {
  const [file] = parsed.positional;
  if (!file) throw new UsageError("give a file");
  return file;
}

function integer(parsed: Parsed, name: string, text: string): number {
  if (!/^\d+$/.test(text)) throw new UsageError(`--${name} must be a whole number`);
  return Number(text);
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

const pretty = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

function validatorFor(document: unknown): (input: unknown) => ValidationResult {
  const schema = (document as { schema?: unknown } | null)?.schema;
  if (schema === "ciml/2") return validateCiml;
  if (schema === "iml/1") return validateIml;
  return validateDocument;
}

async function output(parsed: Parsed, io: Io, value: unknown): Promise<void> {
  const target = optional(parsed, "output");
  if (target) await writeFile(target, pretty(value));
  else io.out(pretty(value));
}

function reportIssues(io: Io, result: ValidationResult): number {
  for (const issue of result.issues) {
    io.err(`${issue.code} ${issue.path || "/"}: ${issue.message}\n`);
  }
  return result.ok ? 0 : 1;
}

async function commandValidate(parsed: Parsed, io: Io): Promise<number> {
  const document = await readJson(fileArgument(parsed));
  const remote = optional(parsed, "fetch-specs") && (document as { schema?: string }).schema === "iml/1";
  const result = remote
    ? await validateImlWithSpecs(document as InterfaceDocument)
    : validatorFor(document)(document);
  const code = reportIssues(io, result);
  if (code === 0) io.out("valid\n");
  return code;
}

async function commandDigest(parsed: Parsed, io: Io): Promise<number> {
  const file = fileArgument(parsed);
  const document = (await readJson(file)) as Record<string, unknown>;
  if (optional(parsed, "write")) {
    await writeFile(file, pretty(withDigest(document)));
  }
  io.out(`${computeDigest(document)}\n`);
  return 0;
}

async function commandVerify(parsed: Parsed, io: Io): Promise<number> {
  const document = (await readJson(fileArgument(parsed))) as InterfaceDocument;
  const clients: Record<number, PublicClient> = {};
  for (const entry of parsed.options.get("rpc") ?? []) {
    const separator = entry.indexOf("=");
    if (separator < 0) throw new UsageError("--rpc takes <chainId>=<url>");
    const chainId = integer(parsed, "rpc", entry.slice(0, separator));
    clients[chainId] = createPublicClient({ transport: http(entry.slice(separator + 1)) }) as PublicClient;
  }
  const report = await verifyCiml(document, { clients });
  io.out(pretty(report));
  return report.level === "digest-invalid" || report.codeHashes.some((item) => item.status === "mismatch") ? 1 : 0;
}

async function commandFromAbi(parsed: Parsed, io: Io): Promise<number> {
  const loaded = await readJson(fileArgument(parsed));
  // Compilers usually wrap the ABI: accept the artifact as well as the bare list.
  const abi = Array.isArray(loaded) ? loaded : (loaded as { abi?: unknown }).abi;
  if (!Array.isArray(abi)) throw new UsageError("the file holds no ABI");
  const decimals = optional(parsed, "token-decimals");
  const document = fromAbi({
    abi: abi as Record<string, unknown>[],
    chainId: integer(parsed, "chain-id", required(parsed, "chain-id")),
    address: required(parsed, "address"),
    id: required(parsed, "id"),
    title: required(parsed, "title"),
    ...(decimals ? { tokenDecimals: integer(parsed, "token-decimals", decimals) } : {}),
  });
  const code = reportIssues(io, validateCiml(document));
  if (code === 0) await output(parsed, io, document);
  return code;
}

async function commandFromOpenApi(parsed: Parsed, io: Io): Promise<number> {
  const spec = (await readJson(fileArgument(parsed))) as Record<string, unknown>;
  const title = optional(parsed, "title");
  const server = optional(parsed, "server");
  const { document, skipped } = fromOpenApi({
    spec,
    id: required(parsed, "id"),
    ...(title ? { title } : {}),
    ...(server ? { server } : {}),
  });
  for (const item of skipped) io.err(`skipped ${item}\n`);
  const code = reportIssues(io, validateIml(document));
  if (code === 0) await output(parsed, io, document);
  return code;
}

async function commandMigrate(parsed: Parsed, io: Io): Promise<number> {
  const { document, report } = migrateV1(await readJson(fileArgument(parsed)));
  for (const item of report.errors) io.err(`error ${item.path}: ${item.message}\n`);
  for (const item of report.dropped) io.err(`dropped ${item.path}: ${item.message}\n`);
  for (const item of report.warnings) io.err(`check ${item.path}: ${item.message}\n`);
  if (!document) return 1;
  const code = reportIssues(io, validateCiml(document));
  if (code === 0) await output(parsed, io, document);
  return code;
}

async function commandTo7730(parsed: Parsed, io: Io): Promise<number> {
  const document = (await readJson(fileArgument(parsed))) as InterfaceDocument;
  const code = reportIssues(io, validateCiml(document));
  if (code !== 0) return code;
  const binding = optional(parsed, "binding");
  const owner = optional(parsed, "owner");
  await output(parsed, io, to7730(document, { ...(binding ? { binding } : {}), ...(owner ? { owner } : {}) }));
  return 0;
}

async function commandAttachSignature(parsed: Parsed, io: Io): Promise<number> {
  const file = fileArgument(parsed);
  const document = (await readJson(file)) as InterfaceDocument & Record<string, unknown>;
  const digest = computeDigest(document);
  if (document.integrity && document.integrity.digest !== digest) {
    io.err("E_DIGEST: the document changed after its digest was written\n");
    return 1;
  }
  const kind = optional(parsed, "kind") ?? "eip191";
  if (kind !== "eip191" && kind !== "erc1271") throw new UsageError("--kind is eip191 or erc1271");
  const chain = optional(parsed, "chain-id");
  if (kind === "erc1271" && !chain) throw new UsageError("erc1271 signatures need --chain-id");
  const signature: DocumentSignature = {
    kind,
    signer: required(parsed, "signer"),
    signature: required(parsed, "signature"),
    ...(chain ? { chainId: integer(parsed, "chain-id", chain) } : {}),
  };
  document.integrity = { digest, signatures: [...(document.integrity?.signatures ?? []), signature] };
  await writeFile(file, pretty(document));
  return 0;
}

/** Run one command. Returns the exit code. */
export async function run(argv: string[], io: Io): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "help") {
    io.out(`${USAGE}\n`);
    return command ? 0 : 2;
  }
  const handlers: Record<string, (parsed: Parsed, io: Io) => Promise<number>> = {
    validate: commandValidate,
    digest: commandDigest,
    verify: commandVerify,
    "from-abi": commandFromAbi,
    "from-openapi": commandFromOpenApi,
    migrate: commandMigrate,
    "to-7730": commandTo7730,
    "attach-signature": commandAttachSignature,
  };
  const handler = Object.prototype.hasOwnProperty.call(handlers, command) ? handlers[command] : undefined;
  if (!handler) {
    io.err(`unknown command "${command}"\n\n${USAGE}\n`);
    return 2;
  }
  try {
    return await handler(parseArgs(rest), io);
  } catch (error) {
    if (error instanceof UsageError) {
      io.err(`${error.message}\n`);
      return 2;
    }
    io.err(`${(error as Error).message}\n`);
    return 1;
  }
}
