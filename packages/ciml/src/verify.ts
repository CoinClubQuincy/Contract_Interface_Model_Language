import {
  type Hex,
  hashMessage,
  isAddressEqual,
  keccak256,
  type PublicClient,
  recoverMessageAddress,
} from "viem";
import { computeDigest, type InterfaceDocument, signingMessage } from "@ciml/core";

const ERC1271_MAGIC = "0x1626ba7e";
const ERC1271_ABI = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
  },
] as const;

export type TrustLevel = "digest-invalid" | "unverified" | "digest-valid" | "signed";

export interface SignatureResult {
  kind: "eip191" | "erc1271";
  signer: string;
  valid: boolean;
  reason?: string;
}

export interface CodeHashResult {
  binding: string;
  status: "match" | "mismatch" | "unchecked" | "absent";
}

export interface VerifyReport {
  level: TrustLevel;
  digest: string;
  signatures: SignatureResult[];
  codeHashes: CodeHashResult[];
}

export interface VerifyOptions {
  /** A client per chain ID. Needed for ERC-1271 signatures and codeHash checks. */
  clients?: Record<number, PublicClient>;
}

async function checkSignature(
  entry: NonNullable<NonNullable<InterfaceDocument["integrity"]>["signatures"]>[number],
  digest: string,
  options: VerifyOptions,
): Promise<SignatureResult> {
  const base = { kind: entry.kind, signer: entry.signer };
  const message = signingMessage(digest);
  const signature = entry.signature as Hex;
  try {
    if (entry.kind === "eip191") {
      const recovered = await recoverMessageAddress({ message, signature });
      return isAddressEqual(recovered, entry.signer as Hex)
        ? { ...base, valid: true }
        : { ...base, valid: false, reason: "signed by a different address" };
    }
    const client = entry.chainId === undefined ? undefined : options.clients?.[entry.chainId];
    if (!client) return { ...base, valid: false, reason: "no client for the signer's chain" };
    const magic = await client.readContract({
      address: entry.signer as Hex,
      abi: ERC1271_ABI,
      functionName: "isValidSignature",
      args: [hashMessage(message), signature],
    });
    return magic === ERC1271_MAGIC
      ? { ...base, valid: true }
      : { ...base, valid: false, reason: "the contract rejected the signature" };
  } catch (error) {
    return { ...base, valid: false, reason: (error as Error).message.split("\n")[0] };
  }
}

/**
 * Report what can be proven about a document. "signed" means a listed signer really signed this
 * content. It does not mean that signer is someone you should trust: that is the host's decision.
 */
export async function verifyCiml(
  document: InterfaceDocument,
  options: VerifyOptions = {},
): Promise<VerifyReport> {
  const digest = computeDigest(document as unknown as Record<string, unknown>);
  const codeHashes: CodeHashResult[] = [];
  for (const [name, binding] of Object.entries(document.bindings)) {
    if (binding.kind !== "evm") continue;
    if (!binding.codeHash) {
      codeHashes.push({ binding: name, status: "absent" });
      continue;
    }
    const client = options.clients?.[binding.chainId];
    if (!client) {
      codeHashes.push({ binding: name, status: "unchecked" });
      continue;
    }
    const code = await client.getCode({ address: binding.address as Hex });
    const matches = code !== undefined && keccak256(code) === binding.codeHash.toLowerCase();
    codeHashes.push({ binding: name, status: matches ? "match" : "mismatch" });
  }
  if (!document.integrity) return { level: "unverified", digest, signatures: [], codeHashes };
  if (document.integrity.digest !== digest) {
    return { level: "digest-invalid", digest, signatures: [], codeHashes };
  }
  const signatures = await Promise.all(
    (document.integrity.signatures ?? []).map((entry) => checkSignature(entry, digest, options)),
  );
  const level = signatures.some((entry) => entry.valid) ? "signed" : "digest-valid";
  return { level, digest, signatures, codeHashes };
}
