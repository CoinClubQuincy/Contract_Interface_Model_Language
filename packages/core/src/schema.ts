import {
  FIELD_INPUT_TYPES,
  METRIC_TRENDS,
  MODALITIES,
  SCHEMA_IDS,
  SEMANTIC_TYPES,
  TOKEN_GROUPS,
  VALUE_FORMATS,
} from "./vocabulary.js";

const inputSource = {
  type: "object",
  minProperties: 1,
  maxProperties: 1,
  additionalProperties: false,
  properties: {
    field: { type: "string" },
    context: { type: "string" },
    literal: {},
  },
};

const inputs = { type: "object", additionalProperties: { $ref: "#/$defs/inputSource" } };

const tokenGroup = {
  type: "object",
  propertyNames: { pattern: "^[A-Za-z0-9_-]{1,64}$" },
  additionalProperties: { type: ["string", "number"] },
};

/** JSON Schema for both document kinds. spec/schemas/document.schema.json is generated from this. */
export const documentSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/CoinClubQuincy/Contract_Interface_Model_Language/spec/schemas/document.schema.json",
  title: "CIML or IML document",
  type: "object",
  required: ["schema", "id", "version", "title", "bindings", "root", "objects"],
  additionalProperties: false,
  properties: {
    schema: { enum: [...SCHEMA_IDS] },
    id: { type: "string", pattern: "^[a-z0-9]([a-z0-9.-]{0,126}[a-z0-9])?$" },
    version: { type: "string", pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$" },
    title: { type: "string", minLength: 1, maxLength: 120 },
    description: { type: "string", maxLength: 2000 },
    locale: { type: "string", pattern: "^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$" },
    homepage: { type: "string" },
    icon: { type: "string" },
    tokens: {
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(TOKEN_GROUPS.map((group) => [group, tokenGroup])),
    },
    bindings: {
      type: "object",
      minProperties: 1,
      propertyNames: { pattern: "^[a-zA-Z][a-zA-Z0-9_-]{0,63}$" },
      additionalProperties: { $ref: "#/$defs/binding" },
    },
    data: {
      type: "object",
      propertyNames: { pattern: "^[a-zA-Z][a-zA-Z0-9_-]{0,63}$" },
      additionalProperties: {
        type: "object",
        required: ["binding", "operation"],
        additionalProperties: false,
        properties: {
          binding: { type: "string" },
          operation: { type: "string", minLength: 1 },
          inputs,
          select: { type: "string", pattern: "^(/.*)?$" },
        },
      },
    },
    root: { type: "string" },
    objects: {
      type: "object",
      minProperties: 1,
      maxProperties: 5000,
      propertyNames: { pattern: "^[a-z][a-z0-9._-]{0,127}$" },
      additionalProperties: { $ref: "#/$defs/object" },
    },
    integrity: {
      type: "object",
      required: ["digest"],
      additionalProperties: false,
      properties: {
        digest: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
        signatures: {
          type: "array",
          items: {
            type: "object",
            required: ["kind", "signer", "signature"],
            additionalProperties: false,
            properties: {
              kind: { enum: ["eip191", "erc1271"] },
              signer: { type: "string" },
              signature: { type: "string", pattern: "^0x([0-9a-fA-F]{2})+$" },
              chainId: { type: "integer", minimum: 1 },
            },
          },
        },
      },
    },
  },
  $defs: {
    inputSource,
    binding: {
      oneOf: [
        {
          type: "object",
          required: ["kind", "chainId", "address", "abi"],
          additionalProperties: false,
          properties: {
            kind: { const: "evm" },
            chainId: { type: "integer", minimum: 1 },
            address: { type: "string", pattern: "^0x[0-9a-fA-F]{40}$" },
            abi: { type: "array", items: { type: "object" } },
            codeHash: { type: "string", pattern: "^0x[0-9a-fA-F]{64}$" },
          },
        },
        {
          type: "object",
          required: ["kind", "server", "spec"],
          additionalProperties: false,
          properties: {
            kind: { const: "openapi" },
            server: { type: "string" },
            spec: {
              oneOf: [
                {
                  type: "object",
                  required: ["inline"],
                  additionalProperties: false,
                  properties: { inline: { type: "object" } },
                },
                {
                  type: "object",
                  required: ["url", "digest"],
                  additionalProperties: false,
                  properties: {
                    url: { type: "string" },
                    digest: { type: "string", pattern: "^sha256:[0-9a-f]{64}$" },
                  },
                },
              ],
            },
          },
        },
      ],
    },
    object: {
      type: "object",
      required: ["type", "purpose", "accessibility"],
      additionalProperties: false,
      properties: {
        type: { enum: [...SEMANTIC_TYPES] },
        purpose: { type: "string", minLength: 1, maxLength: 500 },
        accessibility: {
          type: "object",
          required: ["label"],
          additionalProperties: false,
          properties: {
            label: { type: "string", minLength: 1 },
            hint: { type: "string" },
          },
        },
        children: { type: "array", items: { type: "string" }, uniqueItems: true },
        text: { type: "string" },
        value: {
          type: "object",
          required: ["data"],
          additionalProperties: false,
          properties: {
            data: { type: "string" },
            format: { enum: [...VALUE_FORMATS] },
            decimals: { type: "integer", minimum: 0, maximum: 77 },
          },
        },
        field: {
          type: "object",
          required: ["name", "inputType"],
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1 },
            inputType: { enum: [...FIELD_INPUT_TYPES] },
            label: { type: "string" },
            required: { type: "boolean" },
            placeholder: { type: "string" },
            decimals: { type: "integer", minimum: 0, maximum: 77 },
            format: { enum: ["tokenAmount", "addressName", "date", "raw"] },
            options: {
              type: "array",
              items: {
                type: "object",
                required: ["label", "value"],
                additionalProperties: false,
                properties: { label: { type: "string" }, value: { type: "string" } },
              },
            },
          },
        },
        action: {
          type: "object",
          required: ["binding", "operation", "effect"],
          additionalProperties: false,
          properties: {
            binding: { type: "string" },
            operation: { type: "string", minLength: 1 },
            inputs,
            effect: { enum: ["read", "write"] },
            value: { $ref: "#/$defs/inputSource" },
            confirm: {
              type: "object",
              required: ["title"],
              additionalProperties: false,
              properties: { title: { type: "string" }, body: { type: "string" } },
            },
          },
        },
        src: { type: "string" },
        href: { type: "string" },
        trend: { enum: [...METRIC_TRENDS] },
        modalities: { type: "array", items: { enum: [...MODALITIES] }, uniqueItems: true },
        presentation: { type: "object", additionalProperties: { type: "string" } },
        extension: {
          type: "object",
          required: ["id", "version", "fallback"],
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            version: { type: "string" },
            fallback: { type: "string" },
          },
        },
      },
    },
  },
} as const;
