import type { ValueSpec } from "./types.js";

/** Shift an integer string right by `decimals` places, without losing precision. */
function formatAmount(raw: string, decimals: number): string {
  if (!/^-?\d+$/.test(raw)) return raw;
  const negative = raw.startsWith("-");
  const digits = (negative ? raw.slice(1) : raw).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals > 0 ? digits.slice(-decimals).replace(/0+$/, "") : "";
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function toDate(value: unknown): Date | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  const date =
    typeof value === "string" && Number.isNaN(numeric)
      ? new Date(value)
      : new Date(numeric * 1000); // Numbers are unix seconds, as contracts store them.
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stringify(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    typeof item === "bigint" ? item.toString() : item,
  );
}

/** Turn a result into display text. Output is plain text, for a renderer to escape as usual. */
export function formatValue(value: unknown, spec: Partial<ValueSpec> = {}): string {
  if (value === undefined || value === null) return "";
  const text = typeof value === "object" ? stringify(value) : String(value);
  switch (spec.format) {
    case "amount":
      return formatAmount(text, spec.decimals ?? 0);
    case "date":
      return toDate(value)?.toISOString().slice(0, 10) ?? text;
    case "datetime":
      return toDate(value)?.toISOString() ?? text;
    case "percent":
      return `${text}%`;
    default:
      return text;
  }
}
