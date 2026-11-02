import type { WalletProvider } from "./runtime.js";

export interface DiscoveredWallet {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: WalletProvider;
}

/** Find installed browser wallets through EIP-6963. */
export function discoverWallets(target: Window, waitMs = 200): Promise<DiscoveredWallet[]> {
  const wallets = new Map<string, DiscoveredWallet>();
  const listener = (event: Event): void => {
    const detail = (event as CustomEvent<DiscoveredWallet>).detail;
    if (detail?.info?.uuid && detail.provider) wallets.set(detail.info.uuid, detail);
  };
  target.addEventListener("eip6963:announceProvider", listener);
  target.dispatchEvent(new Event("eip6963:requestProvider"));
  return new Promise((resolve) => {
    setTimeout(() => {
      target.removeEventListener("eip6963:announceProvider", listener);
      resolve([...wallets.values()]);
    }, waitMs);
  });
}
