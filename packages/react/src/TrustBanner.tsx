import type { ReactNode } from "react";

export interface TrustSummary {
  level: "digest-invalid" | "unverified" | "digest-valid" | "signed" | (string & {});
  /** Addresses whose signatures checked out. */
  signers?: string[];
}

function describe(trust: TrustSummary | undefined): string {
  switch (trust?.level) {
    case "digest-invalid":
      return "This interface changed after it was published. Do not use it.";
    case "digest-valid":
      return "This interface is intact, but nobody has signed it.";
    case "signed":
      return `Signed by ${(trust.signers ?? []).join(", ")}. Check that you trust this signer.`;
    default:
      return "This interface has not been verified.";
  }
}

/** States what was proven, and leaves deciding whom to trust to the viewer. */
export function TrustBanner({ trust }: { trust?: TrustSummary }): ReactNode {
  const level = trust?.level ?? "unverified";
  return (
    <div className="ciml-trust" data-level={level} role={level === "digest-invalid" ? "alert" : "status"}>
      {describe(trust)}
    </div>
  );
}
