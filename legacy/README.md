# Legacy: CIML v1 (2022-2023)

> [!CAUTION]
> **Do not use this code with real funds.** It is archived for history only and
> receives no fixes.

Known problems in `ios-app/`:

- `Compiler/Wallets.swift` hardcodes the keystore password `"1234"` and the seed
  `"my-secret-seed"`, and logs wallet addresses with `print`.
- CIML documents are downloaded and rendered with no signature or integrity
  check, so a document can point users at any contract.
- The default RPC endpoint is a plain-HTTP local node address.

`v1-spec/` holds the original document format and examples. CIML v2 replaces all
of this; `ciml migrate` converts v1 documents to the v2 format.

The final v1 code is tagged `v1.0.1-ios`. CocoaPods dependencies were removed
from the tree, so run `pod install` to rebuild it.
