import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { signingMessage } from "@ciml/core";
import { run } from "../src/run.js";

const examples = new URL("../../../examples/documents/", import.meta.url).pathname;
const legacy = new URL("../../../legacy/v1-spec/examples/", import.meta.url).pathname;
// Anvil's first default key: public, and used only in tests.
const signer = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ciml-cli-"));
});

async function cli(...argv: string[]) {
  let out = "";
  let err = "";
  const code = await run(argv, { out: (text) => (out += text), err: (text) => (err += text) });
  return { code, out, err };
}
const file = (name: string, value: unknown) => {
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
};
const abi = [
  { type: "function", name: "total", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "send", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }], outputs: [] },
];
const spec = {
  openapi: "3.1.0",
  info: { title: "S", version: "1.0.0" },
  servers: [{ url: "https://api.example.com" }],
  paths: { "/x": { get: { operationId: "getX" } }, "/y": { get: {} } },
};

describe("usage", () => {
  it("prints help", async () => {
    expect((await cli("--help")).out).toContain("ciml validate");
    expect((await cli()).code).toBe(2);
  });
  it.each([
    [["nope"], /unknown command/],
    [["toString"], /unknown command/],
    [["validate"], /give a file/],
    [["from-abi", "x.json"], /chain-id|ENOENT|required/],
    [["verify", "--rpc"], /needs a value/],
  ])("rejects %j", async (argv, message) => {
    const { code, err } = await cli(...argv);
    expect(code).not.toBe(0);
    expect(err).toMatch(message);
  });
  it("reports a missing file and bad JSON", async () => {
    expect((await cli("validate", join(dir, "none.json"))).code).toBe(1);
    const bad = join(dir, "bad.json");
    writeFileSync(bad, "{");
    expect((await cli("validate", bad)).code).toBe(1);
  });
});

describe("validate", () => {
  it.each(readdirSync(examples))("accepts the example %s", async (name) => {
    const { code, out } = await cli("validate", join(examples, name));
    expect(out).toBe("valid\n");
    expect(code).toBe(0);
  });
  it("prints stable codes and fails", async () => {
    const document = JSON.parse(readFileSync(join(examples, "erc20.ciml.json"), "utf8"));
    document.title = "Changed";
    const { code, err } = await cli("validate", file("d.json", document));
    expect(code).toBe(1);
    expect(err).toContain("E_DIGEST /integrity/digest");
  });
  it("applies binding checks by kind", async () => {
    const document = JSON.parse(readFileSync(join(examples, "erc20.ciml.json"), "utf8"));
    delete document.integrity;
    document.objects["transfer.submit"].action.operation = "drain";
    const { code, err } = await cli("validate", file("d.json", document));
    expect(code).toBe(1);
    expect(err).toContain("E_ABI_FUNCTION");
  });
});

describe("digest", () => {
  it("prints, then writes, and the result validates", async () => {
    const generated = await cli("from-abi", file("abi.json", abi), "--chain-id", "1", "--address", TOKEN, "--id", "t.t", "--title", "T");
    const path = file("doc.json", JSON.parse(generated.out));
    const printed = await cli("digest", path);
    expect(printed.out).toMatch(/^sha256:[0-9a-f]{64}\n$/);
    expect(JSON.parse(readFileSync(path, "utf8")).integrity).toBeUndefined();
    await cli("digest", path, "--write");
    expect(JSON.parse(readFileSync(path, "utf8")).integrity.digest).toBe(printed.out.trim());
    expect((await cli("validate", path)).code).toBe(0);
  });
});

describe("generators", () => {
  it("from-abi accepts a compiler artifact and writes a file", async () => {
    const output = join(dir, "out.json");
    const { code } = await cli("from-abi", file("a.json", { abi }), "--chain-id", "50", "--address", TOKEN, "--id", "t.t", "--title", "T", "-o", output);
    expect(code).toBe(0);
    expect(JSON.parse(readFileSync(output, "utf8")).bindings.contract.chainId).toBe(50);
  });
  it("from-abi rejects a bad chain ID and a file with no ABI", async () => {
    expect((await cli("from-abi", file("a.json", abi), "--chain-id", "one", "--address", TOKEN, "--id", "t.t", "--title", "T")).code).toBe(2);
    expect((await cli("from-abi", file("b.json", {}), "--chain-id", "1", "--address", TOKEN, "--id", "t.t", "--title", "T")).code).toBe(2);
  });
  it("from-openapi reports what it skipped", async () => {
    const { code, out, err } = await cli("from-openapi", file("s.json", spec), "--id", "t.t");
    expect(code).toBe(0);
    expect(err).toContain("skipped GET /y");
    expect(JSON.parse(out).schema).toBe("iml/1");
  });
});

describe("migrate", () => {
  it.each(readdirSync(legacy).filter((name) => name.endsWith(".json")))("migrates %s", async (name) => {
    const output = join(dir, "out.json");
    const { code, err } = await cli("migrate", join(legacy, name), "-o", output);
    expect(code).toBe(0);
    expect(err).toContain("dropped byteCode");
    expect((await cli("validate", output)).code).toBe(0);
  });
  it("fails with no output when the source cannot convert", async () => {
    const { code, out, err } = await cli("migrate", file("v.json", [{ networks: ["Atlantis"] }]));
    expect(code).toBe(1);
    expect(out).toBe("");
    expect(err).toContain("error networks");
  });
});

describe("to-7730", () => {
  it("exports a valid document", async () => {
    const { code, out } = await cli("to-7730", join(examples, "erc20.ciml.json"), "--owner", "Circle");
    expect(code).toBe(0);
    const descriptor = JSON.parse(out);
    expect(descriptor.metadata.owner).toBe("Circle");
    expect(Object.keys(descriptor.display.formats)).toContain("transfer(address to,uint256 amount)");
  });
  it("refuses an invalid document", async () => {
    const document = JSON.parse(readFileSync(join(examples, "erc20.ciml.json"), "utf8"));
    document.title = "Changed";
    expect((await cli("to-7730", file("d.json", document))).code).toBe(1);
  });
});

describe("verify and attach-signature", () => {
  it("takes a signature through to a signed report", async () => {
    const path = file("doc.json", JSON.parse(readFileSync(join(examples, "erc20.ciml.json"), "utf8")));
    const digest = (await cli("digest", path)).out.trim();
    const signature = await signer.signMessage({ message: signingMessage(digest) });
    expect((await cli("attach-signature", path, "--signer", signer.address, "--signature", signature)).code).toBe(0);
    const { code, out } = await cli("verify", path);
    expect(code).toBe(0);
    expect(JSON.parse(out)).toMatchObject({ level: "signed", signatures: [{ valid: true }] });
    expect((await cli("validate", path)).code).toBe(0);
  });
  it("fails verification when the content changed", async () => {
    const document = JSON.parse(readFileSync(join(examples, "erc20.ciml.json"), "utf8"));
    document.title = "Changed";
    const { code, out } = await cli("verify", file("d.json", document));
    expect(code).toBe(1);
    expect(JSON.parse(out).level).toBe("digest-invalid");
  });
  it("refuses to sign a document that changed after its digest", async () => {
    const document = JSON.parse(readFileSync(join(examples, "erc20.ciml.json"), "utf8"));
    document.title = "Changed";
    const { code, err } = await cli("attach-signature", file("d.json", document), "--signer", signer.address, "--signature", "0xab");
    expect(code).toBe(1);
    expect(err).toContain("E_DIGEST");
  });
  it("needs a chain for ERC-1271", async () => {
    const path = join(examples, "erc20.ciml.json");
    const { code } = await cli("attach-signature", path, "--kind", "erc1271", "--signer", signer.address, "--signature", "0xab");
    expect(code).toBe(2);
  });
  it("rejects a malformed --rpc", async () => {
    expect((await cli("verify", join(examples, "erc20.ciml.json"), "--rpc", "nourl")).code).toBe(2);
  });
});
