/** An error with a stable code that hosts can act on. */
export class InterfaceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InterfaceError";
    this.code = code;
  }
}
