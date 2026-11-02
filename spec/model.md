# The interface model

This is what CIML and IML share. [ciml.md](ciml.md) and [iml.md](iml.md) cover what differs. The machine-readable form is [schemas/document.schema.json](schemas/document.schema.json).

The words MUST, MUST NOT and SHOULD have their RFC 2119 meanings. A conforming implementation passes every vector in [`conformance/`](../conformance).

## Document

| Key | Required | Meaning |
|---|---|---|
| `schema` | yes | `ciml/2` or `iml/1` |
| `id` | yes | Stable name, such as `example.token` |
| `version` | yes | Version of this document, as `major.minor.patch` |
| `title` | yes | Up to 120 characters |
| `description`, `locale` | no | Shown to the user. `locale` is a language tag. |
| `homepage`, `icon` | no | Links: `https` or `ipfs` |
| `tokens` | no | Design tokens |
| `bindings` | yes | What the document can call |
| `data` | no | Named reads, for showing values |
| `root` | yes | The id of the top object |
| `objects` | yes | Every object, by id. At most 5,000. |
| `integrity` | no | Digest and signatures |

Unknown keys are invalid at every level.

## Objects

Each object has a `type`, a `purpose` and an `accessibility.label`. Together these state what it means, so a renderer on any device can present it well.

```json
{
  "type": "field",
  "purpose": "How many tokens to send",
  "accessibility": { "label": "Amount", "hint": "Up to 18 decimal places" },
  "field": { "name": "amount", "inputType": "amount", "decimals": 18, "required": true }
}
```

Ids match `^[a-z][a-z0-9._-]{0,127}$`.

**Containment.** Objects form one tree, through `children`. There is exactly one root, each object has one parent, there are no cycles, and every object is reachable.

**Types** form a closed list:

| Group | Types |
|---|---|
| Structure | `workspace` `screen` `page` `panel` `group` `list` `table` `tree` `virtual_list` |
| Visual | `map` `chart` `diagram` `timeline` |
| Input and action | `form` `field` `action` `command` `signature` |
| Feedback | `status` `alert` `progress` `notification` `metric` `telemetry` |
| Content | `text` `document` `code` `symbol` `image` `audio` `media.stream` `media.recording` |
| Other | `navigation` `authentication` `workflow` `collaborator` `drag_drop` `spatial.anchor` `spatial.object` `extension` |

A type names a meaning, and has no fixed appearance. `command` is an instruction shown to a person, and never runs anything. A renderer with no way to show a type MUST still expose its label and children.

**Modalities** (optional) list how an object can be used: `visual` `touch` `pointer` `keyboard` `controller` `gaze` `gesture` `voice` `audio` `haptic` `spatial` `hardware` `sensor`.

**Extensions.** An `extension` object names a custom type and MUST name a `fallback` object, which renderers without that extension show.

## Fields

`field` has a unique `name` and an `inputType`: `text` `number` `amount` `address` `boolean` `hex` `email` `url` `date` `select`.

- `amount` MUST state `decimals`, so a typed `1` cannot be taken for one base unit. Implementations MUST NOT use floating point for amounts.
- `select` MUST list `options`.

## Reading values

An entry in `data` names a read. An object shows it through `value`:

```json
{
  "data": { "supply": { "binding": "token", "operation": "totalSupply" } },
  "objects": {
    "total": {
      "type": "metric",
      "purpose": "Tokens in existence",
      "accessibility": { "label": "Total supply" },
      "value": { "data": "supply", "format": "amount", "decimals": 18 }
    }
  }
}
```

`select` on a data entry is an RFC 6901 JSON pointer into the result. `format` is one of `text` `number` `amount` `address` `boolean` `date` `datetime` `percent` `json`. A renderer MUST NOT show a stale or invented value when a read fails.

## Actions

```json
{
  "binding": "token",
  "operation": "transfer",
  "effect": "write",
  "inputs": { "to": { "field": "send.to" }, "amount": { "field": "send.amount" } },
  "confirm": { "title": "Send tokens" }
}
```

An input has exactly one source:

| Source | Meaning |
|---|---|
| `{ "field": "<object id>" }` | What the user typed |
| `{ "context": "<name>" }` | A value from the host, from a fixed list per schema |
| `{ "literal": <JSON> }` | A fixed value |

**`effect` is a claim, and is checked.** A validator MUST compare it with the binding. A runtime MUST report the real effect, and a renderer MUST go by what the runtime reports.

**Every write is reviewed.** A renderer MUST show the runtime's decoded intent and get explicit confirmation before executing, whether or not the document has a `confirm` block. `confirm` text MUST be presented as the document's claim, apart from the decoded facts.

## Appearance

Documents do not contain styles. `presentation` holds two kinds of value:

| Kind | Keys | Values |
|---|---|---|
| Roles | `variant` | `primary` `secondary` `danger` `ghost` |
| | `priority` | `high` `normal` `low` |
| | `region` | `header` `main` `aside` `footer` |
| Token slots | `tone` `surface` `gap` `inset` `rounding` `elevation` `typography` `motion` | A reference such as `{color.accent}` |

Tokens are grouped: `color` `typography` `spacing` `size` `radius` `elevation` `motion`. A value MUST NOT contain `;` `{` `}` `<` `>` `@` or `\`, and the only CSS functions allowed are `rgb` `rgba` `hsl` `hsla` `hwb` `lab` `lch` `oklab` `oklch` `color` `color-mix` `calc` `min` `max` `clamp` `cubic-bezier` `steps`. This stops a value making network requests.

## Links

`homepage`, `icon`, `src` and `href` MUST use `https` or `ipfs`.

## Forbidden keys

These MUST be refused as keys at any depth: `command` `cmd` `shell` `argv` `script` `executable` `eval` `html` `innerHTML` `dangerouslySetInnerHTML` `__proto__` `constructor` `prototype`.

Three kinds of content are exempt, because their names are not format keywords: the contents of `bindings`, since an ABI or spec can legally use any name, and the keys directly inside `objects`, `data`, `inputs` and token groups, since an author chose them. `{ "objects": { "script": { … } } }` is an object that happens to be called script, and is valid. The value inside is still checked.

## Integrity

The digest is `sha256:` plus the lowercase hex SHA-256 of the document's [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785) canonical form, leaving out the top-level `integrity` key. `conformance/vectors/canonical.json` holds test cases.

A signature signs this exact text as an EIP-191 personal message, which stops it being replayed as some other message:

```
CIML document digest: sha256:<hex>
```

`integrity.signatures` holds the results, each with `kind`, `signer`, `signature`, and a `chainId` for `erc1271`.

Reports use these levels:

| Level | Meaning |
|---|---|
| `digest-invalid` | The content changed after the digest was written. Do not use it. |
| `unverified` | There is no digest. |
| `digest-valid` | Intact, but no valid signature. |
| `signed` | At least one listed signer really signed this content. |

`signed` is a statement about who signed. Whether to trust that signer is the host's or the user's decision, and an implementation MUST NOT present it as an endorsement.

## Validation codes

Codes are stable. Messages may change.

| Code | Meaning |
|---|---|
| `E_SCHEMA` | The shape is wrong, or nesting is deeper than 64 levels |
| `E_SCHEMA_KIND` | The binding or schema is the wrong kind for this validator |
| `E_FORBIDDEN_KEY` | An execution key is present |
| `E_URL_SCHEME` | A link is not `https` or `ipfs` |
| `E_ROOT` | The root does not exist, or is a child |
| `E_CYCLE` | Containment loops |
| `E_ORPHAN` | An object cannot be reached from the root |
| `E_UNKNOWN_CHILD` | A child does not exist |
| `E_DUPLICATE_PARENT` | An object has two parents |
| `E_UNKNOWN_BINDING` | There is no such binding |
| `E_UNKNOWN_DATA` | There is no such data entry |
| `E_UNKNOWN_FIELD` | An input names something that is not a field |
| `E_UNKNOWN_CONTEXT` | That context value is not available to this schema |
| `E_OBJECT_SHAPE` | An object is missing a block its type needs |
| `E_DUPLICATE_FIELD` | Two fields share a name |
| `E_EXTENSION_FALLBACK` | An extension has no usable fallback |
| `E_RAW_STYLE` | Raw styling, or a slot without a token reference |
| `E_PRESENTATION` | A role has an unknown value |
| `E_UNKNOWN_TOKEN` | A token reference does not resolve |
| `E_TOKEN_VALUE` | A token value contains unsafe CSS |
| `E_DIGEST` | The digest does not match the content |

Binding codes are listed in [ciml.md](ciml.md) and [iml.md](iml.md).
