import type { HostContext, InputSource } from "./types.js";

export type FieldValues = Record<string, string | boolean | undefined>;

/** Read one input. Returns undefined when the user or host has not supplied it yet. */
export function resolveSource(
  source: InputSource,
  fields: FieldValues,
  context: HostContext,
): unknown {
  if ("literal" in source) return source.literal;
  if ("context" in source) return context[source.context];
  const value = fields[source.field];
  return value === "" ? undefined : value;
}

export function resolveInputs(
  sources: Record<string, InputSource> | undefined,
  fields: FieldValues,
  context: HostContext,
): { values: Record<string, unknown>; missing: string[] } {
  const values: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const [name, source] of Object.entries(sources ?? {})) {
    const value = resolveSource(source, fields, context);
    if (value === undefined) missing.push(name);
    else values[name] = value;
  }
  return { values, missing };
}
