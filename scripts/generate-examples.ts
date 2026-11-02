/** Writes the documents in examples/documents. Run after changing the generators or the model. */
import { writeFileSync } from "node:fs";
import { type InterfaceDocument, withDigest } from "../packages/core/src/index.js";
import { fromAbi, validateCiml } from "../packages/ciml/src/index.js";
import { fromOpenApi, validateIml } from "../packages/iml/src/index.js";

const directory = new URL("../examples/documents/", import.meta.url);

function save(name: string, document: InterfaceDocument, check: (d: unknown) => { ok: boolean; issues: unknown[] }): void {
  const sealed = withDigest(document);
  const result = check(sealed);
  if (!result.ok) throw new Error(`${name}: ${JSON.stringify(result.issues)}`);
  writeFileSync(new URL(name, directory), `${JSON.stringify(sealed, null, 2)}\n`);
}

const erc20Abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
];

// USD Coin on Ethereum mainnet: a real, widely known contract with six decimals.
const erc20 = fromAbi({
  abi: erc20Abi,
  chainId: 1,
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  id: "example.usdc",
  title: "USD Coin",
  description: "Generated from the ERC-20 ABI with: ciml from-abi",
  tokenDecimals: 6,
});
save("erc20.ciml.json", erc20, validateCiml);

const treasuryAbi = [
  { type: "function", name: "reserves", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "withdraw", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
];

const treasury: InterfaceDocument = {
  schema: "ciml/2",
  id: "example.xdc-treasury",
  version: "1.0.0",
  title: "Community Treasury",
  description: "A hand-written example on XDC. The address is a placeholder, with no contract behind it.",
  locale: "en",
  tokens: {
    color: { accent: "#0b6e4f", danger: "#b3261e" },
    spacing: { roomy: "20px" },
    radius: { card: "12px" },
  },
  bindings: {
    treasury: { kind: "evm", chainId: 50, address: "0x1111111111111111111111111111111111111111", abi: treasuryAbi },
  },
  data: {
    reserves: { binding: "treasury", operation: "reserves" },
    paused: { binding: "treasury", operation: "paused" },
  },
  root: "root",
  objects: {
    root: {
      type: "workspace",
      purpose: "Manage the community treasury",
      accessibility: { label: "Community Treasury" },
      children: ["summary", "give", "pay"],
    },
    summary: {
      type: "panel",
      purpose: "Current state of the treasury",
      accessibility: { label: "Summary" },
      presentation: { inset: "{spacing.roomy}", rounding: "{radius.card}" },
      children: ["summary.reserves", "summary.paused"],
    },
    "summary.reserves": {
      type: "metric",
      purpose: "XDC held by the treasury",
      accessibility: { label: "Reserves (XDC)" },
      value: { data: "reserves", format: "amount", decimals: 18 },
      presentation: { tone: "{color.accent}" },
    },
    "summary.paused": {
      type: "status",
      purpose: "Whether withdrawals are paused",
      accessibility: { label: "Withdrawals paused" },
      value: { data: "paused", format: "boolean" },
    },
    give: {
      type: "form",
      purpose: "Add XDC to the treasury",
      accessibility: { label: "Deposit" },
      children: ["give.amount", "give.submit"],
    },
    "give.amount": {
      type: "field",
      purpose: "How much XDC to deposit",
      accessibility: { label: "Amount of XDC" },
      field: { name: "depositAmount", inputType: "amount", decimals: 18, required: true },
    },
    "give.submit": {
      type: "action",
      purpose: "Send the deposit",
      accessibility: { label: "Deposit" },
      presentation: { variant: "primary" },
      action: {
        binding: "treasury",
        operation: "deposit",
        effect: "write",
        value: { field: "give.amount" },
        confirm: { title: "Deposit to the treasury" },
      },
    },
    pay: {
      type: "form",
      purpose: "Pay out from the treasury",
      accessibility: { label: "Withdraw" },
      children: ["pay.to", "pay.amount", "pay.submit"],
    },
    "pay.to": {
      type: "field",
      purpose: "Who receives the payment",
      accessibility: { label: "Recipient", hint: "An XDC address written with the 0x prefix" },
      field: { name: "recipient", inputType: "address", required: true, format: "addressName" },
    },
    "pay.amount": {
      type: "field",
      purpose: "How much XDC to pay",
      accessibility: { label: "Amount of XDC" },
      field: { name: "payAmount", inputType: "amount", decimals: 18, required: true, format: "tokenAmount" },
    },
    "pay.submit": {
      type: "action",
      purpose: "Send the payment",
      accessibility: { label: "Withdraw" },
      presentation: { variant: "danger" },
      action: {
        binding: "treasury",
        operation: "withdraw",
        effect: "write",
        inputs: { to: { field: "pay.to" }, amount: { field: "pay.amount" } },
        confirm: { title: "Pay from the treasury", body: "Payments cannot be reversed." },
      },
    },
  },
};
save("xdc-treasury.ciml.json", treasury, validateCiml);

// Open-Meteo: a public forecast API that needs no key. The spec below covers one operation only.
const weatherSpec = {
  openapi: "3.1.0",
  info: { title: "Weather forecast", version: "1.0.0", description: "Current conditions from Open-Meteo, a free public API." },
  servers: [{ url: "https://api.open-meteo.com" }],
  paths: {
    "/v1/forecast": {
      get: {
        operationId: "getForecast",
        summary: "Get current temperature",
        tags: ["Forecast"],
        parameters: [
          { name: "latitude", in: "query", required: true, schema: { type: "number" } },
          { name: "longitude", in: "query", required: true, schema: { type: "number" } },
          { name: "current", in: "query", required: true, schema: { type: "string", enum: ["temperature_2m", "wind_speed_10m"] } },
        ],
        responses: { "200": { description: "OK" } },
      },
    },
  },
};
save("weather.iml.json", fromOpenApi({ spec: weatherSpec, id: "example.weather" }).document, validateIml);
