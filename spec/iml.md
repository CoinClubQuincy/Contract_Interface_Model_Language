# IML: API bindings

Schema `iml/1`. Everything in [model.md](model.md) applies.

## Binding

```json
{
  "kind": "openapi",
  "server": "https://api.example.com/v1",
  "spec": { "inline": { "openapi": "3.1.0" } }
}
```

`spec` is either `{ "inline": <OpenAPI 3.x> }` or `{ "url": "https://…", "digest": "sha256:…" }`. A remote spec MUST match its digest, computed the same way as a document's. Its `$ref`s are followed only within the document.

`server` MUST be `https` with no credentials, query or fragment. If the spec lists absolute servers, it MUST be one of them, so a document cannot point a spec at a different host.

## Operations

`operation` is an `operationId`. Inputs are named after parameters, or after top-level body properties, or `body` for the whole request body.

Context value: `auth.subject`.

## Effects

`GET` and `HEAD` are reads. Every other method is a write, whatever the document claims, and `data` entries can only use reads. So a `POST` search is an action with a review step, not a data entry.

## Checks

| Code | Meaning |
|---|---|
| `E_OPENAPI_OPERATION` | The `operationId` is missing, or used twice in the spec |
| `E_OPENAPI_EFFECT` | `effect` disagrees with the method |
| `E_OPENAPI_INPUT` | A required input has no source, an input is unknown, a field type does not fit, a document tries to set cookies or a credential header, or an action has a `value` |
| `E_OPENAPI_SPEC` | Not OpenAPI 3.x |
| `E_OPENAPI_DIGEST` | A remote spec differs from its pinned digest |
| `E_SERVER_URL` | The server breaks the rules above |

Remote specs are only checked when fetched, with `ciml validate --fetch-specs` or `validateImlWithSpecs`.

## Client rules

A runtime MUST:

- use `https` only, refuse redirects, and send no ambient credentials;
- percent-encode path values, and reject empty values, `.`, `..`, control characters and values over 256 characters, so a value cannot change the route;
- confirm the final URL stays on the bound server;
- refuse to let a document set `Authorization`, `Cookie`, `Host` or other headers that control routing or identity;
- send a bearer token only to the bound server, and only for operations whose spec requires security;
- after a 401, refresh the token once and try once more;
- retry automatically only for reads, on network failure or on 429, 502, 503 or 504, honouring `Retry-After` up to a limit;
- never retry a write automatically;
- attach an idempotency key to each prepared write, kept across a refresh;
- stop calling an API that keeps failing, and try again after a pause;
- bound time and size, and accept only JSON responses;
- leave error response bodies unread, as they are untrusted text.

`@ciml/openapi` defaults: 15 second timeout, 5 MiB responses, 1 MiB requests, 3 read attempts, and a 30 second pause after 3 failed requests.

Set `idempotencyHeader: null` if an API's CORS policy rejects the `Idempotency-Key` header.

| Warning | Meaning |
|---|---|
| `W_SIGN_IN` | The operation needs sign-in. Blocks the action. |
| `W_EFFECT_MISMATCH` | The document called a write a read. Blocks the action. |
| `W_DELETES` | The method is `DELETE` |
| `W_DEPRECATED` | The spec marks the operation deprecated |

Runtime errors carry codes too: `E_INPUT`, `E_HTTP`, `E_TIMEOUT`, `E_NETWORK`, `E_CONTENT_TYPE`, `E_RESPONSE_TOO_LARGE`, `E_BAD_RESPONSE`, `E_CIRCUIT_OPEN`, `E_BLOCKED`.

## CORS

A browser can only call an API that allows it. If an API does not send the right CORS headers, an IML document cannot use it directly from a web page, and the host needs its own proxy.
