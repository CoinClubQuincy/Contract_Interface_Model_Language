import { type ReactNode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { computeDigest, type InterfaceDocument, type InterfaceRuntime, type ValidationResult, validateDocument } from "@ciml/core";
import { type DiscoveredWallet, discoverWallets, EvmRuntime, validateCiml, verifyCiml } from "@ciml/evm";
import { ApiRuntime, validateIml } from "@ciml/openapi";
import { CimlRenderer, type TrustSummary } from "@ciml/react";
import "@ciml/react/styles.css";
import "./playground.css";
import erc20 from "../../documents/erc20.ciml.json";
import treasury from "../../documents/xdc-treasury.ciml.json";
import weather from "../../documents/weather.iml.json";

const EXAMPLES: Record<string, unknown> = {
  "Public API (IML)": weather,
  "ERC-20 token (CIML)": erc20,
  "XDC treasury (CIML)": treasury,
};

function validatorFor(document: unknown): (input: unknown) => ValidationResult {
  const schema = (document as { schema?: unknown } | null)?.schema;
  if (schema === "ciml/2") return validateCiml;
  if (schema === "iml/1") return validateIml;
  return validateDocument;
}

function parse(text: string): { document?: InterfaceDocument; error?: string } {
  try {
    return { document: JSON.parse(text) as InterfaceDocument };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

function useTrust(document: InterfaceDocument | undefined, valid: boolean): TrustSummary | undefined {
  const [trust, setTrust] = useState<TrustSummary>();
  useEffect(() => {
    setTrust(undefined);
    if (!document || !valid) return;
    let current = true;
    const check = async (): Promise<TrustSummary> => {
      if (document.schema === "ciml/2") {
        const report = await verifyCiml(document);
        return { level: report.level, signers: report.signatures.filter((item) => item.valid).map((item) => item.signer) };
      }
      if (!document.integrity) return { level: "unverified" };
      const matches = document.integrity.digest === computeDigest(document as never);
      return { level: matches ? "digest-valid" : "digest-invalid" };
    };
    void check().then((result) => {
      if (current) setTrust(result);
    });
    return () => {
      current = false;
    };
  }, [document, valid]);
  return trust;
}

function App(): ReactNode {
  const [selected, setSelected] = useState(Object.keys(EXAMPLES)[0] as string);
  const [text, setText] = useState(JSON.stringify(EXAMPLES[selected], null, 2));
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [walletId, setWalletId] = useState<string>();

  useEffect(() => {
    void discoverWallets(window).then(setWallets);
  }, []);

  const { document, error } = useMemo(() => parse(text), [text]);
  const validate = useMemo(() => validatorFor(document), [document]);
  const validation = useMemo(() => (document ? validate(document) : undefined), [document, validate]);
  const trust = useTrust(document, validation?.ok ?? false);
  const wallet = wallets.find((item) => item.info.uuid === walletId);

  const runtime = useMemo<InterfaceRuntime | undefined>(() => {
    if (!document || !validation?.ok) return undefined;
    if (document.schema === "ciml/2") {
      return new EvmRuntime({ document, ...(wallet ? { provider: wallet.provider } : {}) });
    }
    return new ApiRuntime({ document });
  }, [document, validation?.ok, wallet]);

  return (
    <div className="layout">
      <section className="editor" aria-label="Document">
        <h1>CIML Playground</h1>
        <p>
          Everything on the right comes from the document on the left. Edit it, and the checks run
          as you type. Wallet and API calls start from your browser.
        </p>
        <label htmlFor="example">Example</label>
        <select
          id="example"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            setText(JSON.stringify(EXAMPLES[event.target.value], null, 2));
          }}
        >
          {Object.keys(EXAMPLES).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        {document?.schema === "ciml/2" ? (
          <>
            <label htmlFor="wallet">Wallet</label>
            <select id="wallet" value={walletId ?? ""} onChange={(event) => setWalletId(event.target.value || undefined)}>
              <option value="">{wallets.length > 0 ? "Choose a wallet" : "No browser wallet found"}</option>
              {wallets.map((item) => (
                <option key={item.info.uuid} value={item.info.uuid}>{item.info.name}</option>
              ))}
            </select>
          </>
        ) : null}
        <label htmlFor="source">Document JSON</label>
        <textarea id="source" spellCheck={false} value={text} onChange={(event) => setText(event.target.value)} />
      </section>
      <section className="preview" aria-label="Rendered interface">
        {error ? (
          <p role="alert">This is not valid JSON: {error}</p>
        ) : document ? (
          <CimlRenderer key={selected} document={document} validate={validate} {...(runtime ? { runtime } : {})} {...(trust ? { trust } : {})} />
        ) : null}
      </section>
    </div>
  );
}

const container = globalThis.document.getElementById("root");
if (container) createRoot(container).render(<App />);
