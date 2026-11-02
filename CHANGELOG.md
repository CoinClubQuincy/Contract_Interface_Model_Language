# Changelog

## Unreleased: 2.0.0

A complete rewrite, and the first version that is a format rather than an iOS app.

### Added

- `ciml/2`: documents for EVM contracts, checked against their ABI.
- `iml/1`: documents for HTTP APIs, checked against their OpenAPI 3.x spec.
- A shared model with a JSON Schema, stable error codes and language-neutral conformance vectors.
- RFC 8785 digests, with EIP-191 and ERC-1271 signatures.
- A wallet runtime that decodes and tests each write, and blocks the wrong chain, missing code and changed code.
- A hardened API client.
- A React renderer with a review dialog and a trust banner.
- The `ciml` CLI: validate, digest, verify, from-abi, from-openapi, migrate, to-7730, attach-signature.
- ERC-7730 v2 export, and migration from CIML v1 with a report of what was lost.

### Changed

- CIML v1 and its iOS app moved to `legacy/`, and are no longer maintained.

### Removed

- Embedded styling, bytecode and client-side variables. See [spec/ciml.md](spec/ciml.md) for migration.

### Security

- v1 could not check a document before using it, and its examples included a button labelled "next page" that sent native coin to a fixed address. `ciml migrate` refuses to carry such buttons over, and reports them.

## 1.0.1

The final v1 release, tagged `v1.0.1-ios`. See [legacy/README.md](legacy/README.md) for its known problems.
