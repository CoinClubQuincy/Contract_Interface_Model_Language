/** Read an RFC 6901 JSON pointer. Returns undefined when the path does not exist. */
export function readPointer(value: unknown, pointer: string | undefined): unknown {
  if (!pointer) return value;
  let current = value;
  for (const raw of pointer.slice(1).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (typeof current !== "object" || current === null) return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, key)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
