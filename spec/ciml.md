# CIML: smart contract bindings

Schema `ciml/2`. Everything in [model.md](model.md) applies.

## Binding

```json
{
  "kind": "evm",
  "chainId": 50,
  "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "abi": [],
  "codeHash": "0x…"
}
```

- `address` MUST carry an EIP-55 checksum, which catches typos.
- `codeHash` is optional: the keccak-256 of the deployed runtime code. A runtime that can read the code MUST refuse to send a write when it differs.

## Operations

`operation` is a function name. An overloaded name MUST be written as its full signature, such as `transfer(address,uint256)`.

Inputs are named after the ABI's parameters. Unnamed parameters are `arg0`, `arg1` and so on. Lists and tuples may be entered as JSON.

Context values: `wallet.address`, `wallet.chainId`.

`value` on an action supplies native coin. It is only valid on a `payable` function.

## Checks

| Code | Meaning |
|---|---|
| `E_ABI_FUNCTION` | The function is not in the ABI |
| `E_ABI_OVERLOAD` | The name is overloaded: use the full signature |
| `E_ABI_EFFECT` | `effect` disagrees with `stateMutability` (`view` and `pure` are reads), or a data entry calls a function that changes state |
| `E_ABI_VALUE` | `value` is on a function that is not payable |
| `E_ABI_INPUT_MISSING` | An ABI parameter has no source |
| `E_ABI_INPUT_UNKNOWN` | An input is not an ABI parameter |
| `E_ABI_TYPE` | A source cannot produce that ABI type |
| `E_CHECKSUM` | An address has no valid EIP-55 checksum |

## Runtime rules

A runtime MUST:

- use a wallet through EIP-1193, hold no keys, and never ask it to sign raw data for an action;
- refuse to read through a wallet on a different chain from the binding, because that would show wrong data;
- block a write when no account is connected, the wallet is on another chain, there is no code at the address, or the code hash differs;
- test a write with `eth_call` first and warn if it reverts;
- check again immediately before sending that the chain and account have not changed since review;
- reject an address whose mixed-case checksum is wrong, and an amount with more decimal places than the field allows.

Intents may carry these warnings. `W_NO_WALLET`, `W_CHAIN_MISMATCH`, `W_NO_CODE` and `W_CODE_HASH_MISMATCH` block the action.

| Warning | Meaning |
|---|---|
| `W_NO_WALLET` | No account is connected |
| `W_CHAIN_MISMATCH` | The wallet is on another chain |
| `W_NO_CODE` | There is no contract at the address |
| `W_CODE_HASH_MISMATCH` | The deployed code differs from the document |
| `W_SIMULATION_REVERTED` | The test run failed |
| `W_UNLIMITED_APPROVAL` | `approve`, `increaseAllowance` or `increaseApproval` with an amount of 2^255 or more |
| `W_APPROVAL_FOR_ALL` | `setApprovalForAll` granting access |
| `W_SENDS_NATIVE` | The call sends native coin |

Runtime errors carry codes too: `E_INPUT`, `E_NO_WALLET`, `E_CHAIN_MISMATCH`, `E_ACCOUNT_CHANGED`, `E_BLOCKED`, `E_EMPTY_RESULT`.

## ERC-7730 export

`ciml to-7730` writes a clear-signing descriptor from a document's write actions, for wallets and hardware devices that support [ERC-7730](https://ercs.ethereum.org/ERCS/erc-7730). It targets the v2 schema, of which [`third_party/erc7730-v2.schema.json](third_party/erc7730-v2.schema.json)` is a copy. ERC-7730 is a draft and may change.

A `tokenAmount` field exports `tokenPath: "@.to"`, meaning the token is the contract being called. Edit the descriptor if the token is a parameter.

## Migrating from v1

`ciml migrate` converts a v1 document and reports everything that did not carry over. Read the report: the result usually does less than the original.

- `XDC` maps to chain 50. Other networks in a small known list also map, and an unknown one stops the migration.
- An `xdc` address prefix becomes `0x`.
- The ABI's stated mutability wins over what v1 called a function.
- Buttons with `Send` variables are **not** carried over. In v1 they sent native coin to a fixed address, whatever the button said. The report names the amount and address.
- Styling, bytecode, screenshots and other client behaviour are dropped.
