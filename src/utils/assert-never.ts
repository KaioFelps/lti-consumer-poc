import { IrrecoverableError } from "@/core/errors/irrecoverable-error";

/**
 * Typescript utility to ensure every case of `x` have been covered.
 */
export function assertNever(x: never): never {
  throw new IrrecoverableError(`Unhandled case: ${JSON.stringify(x)}`);
}
