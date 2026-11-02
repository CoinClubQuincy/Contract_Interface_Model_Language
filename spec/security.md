# Security model

Treat every document as untrusted input, even a signed one. This page says what the design protects against and what it does not.

## What is protected

| Threat | Protection |
|---|---|
| A document runs code | No execution keys, a closed vocabulary, unknown keys rejected, and all text rendered as text. No `dangerouslySetInnerHTML`. |
| A style or link makes a network request | Token values are limited to safe CSS functions, links to `https` and `ipfs`, and remote images are off until the host opts in. |
| A document calls something other than what it shows | Calls are checked against the ABI or spec, and the review shows the decoded call. |
| A document calls a write a read | Validators reject it, and the runtime reports the real effect. The renderer goes by the runtime. |
| A wrong chain shows wrong data, or sends to the wrong place | Reads and writes both refuse a wallet on the wrong chain, and writes check again at send time. |
| A contract was replaced at the same address | `codeHash` blocks the write. |
| A typo in an address or amount | Checksums, integer ranges and a limit on decimal places. The review shows what was typed beside what will be sent. |
| An unlimited token approval goes unnoticed | The review warns about standard approval functions. |
| A document changes after publication | The digest. |
| A token leaks to another host | HTTPS only, redirects refused, and tokens sent only to the bound server for operations that need them. |
| A path value changes the route | Encoding and rejection, with a check on the final URL. |
| A hostile API exhausts the client | Size and time limits, JSON only, and a circuit breaker. |
| A write happens twice | Writes are not retried, and carry an idempotency key. |

## What is not protected

- **A signature is not an endorsement.** It proves who signed. A scammer can sign too. Show the signer, and let the user or host decide who to trust.
- **Valid does not mean honest.** A contract can do harm while matching its ABI perfectly. A document can describe it accurately or mislead in its labels and `purpose` text, so the decoded call in the review is the thing to rely on.
- **Labels are the author's words.** A button called "Claim reward" can call `approve`. The review shows the real call, but a person still has to read it.
- **A simulation is not a promise.** State can change between the test run and the transaction, and a contract can behave differently when simulated.
- **Approval warnings go by function name.** A contract with a non-standard approval function gets no warning.
- **The wallet and host are trusted.** A malicious wallet, browser extension or host page can do what it likes. Nothing here defends against them.
- **Reads go through your wallet's RPC, or the one the host configures,** and a dishonest RPC can return false values. Check important values independently.
- **API responses are shown as data, not verified.** A dishonest API can return anything.
- **Remote images reveal the viewer's IP address,** if the host enables them.
- **`ipfs` links rely on the host's gateway.**

## Known limitations

- **Strict CSP.** The validator compiles its schema at runtime, so a page needs `script-src 'unsafe-eval'`. To avoid this, validate before serving, or wait for the precompiled validator on the roadmap.
- **Duplicate JSON keys.** The digest is computed after parsing, and `JSON.parse` keeps the last duplicate. Two parsers that treat duplicates differently could see different content under one digest. Use one parser for verifying and rendering.
- **Numbers.** RFC 8785 uses JavaScript number serialization, so a large integer in a literal can lose precision. Write large values as strings, which the runtime accepts.
- **EIP-191 signatures.** They bind the digest text only, not an expiry or a chain. Revocation is out of scope.
- **No audit.** This code has not had an independent security audit.

## For hosts

1. Run the kind-specific validator: `validateCiml` or `validateIml`, not only the shared one.
2. Show the result of `verifyCiml` with `TrustBanner`, and decide your own policy for signers.
3. Keep remote images off unless you need them.
4. Render on a page with no secrets, on its own origin, with a Content Security Policy.
