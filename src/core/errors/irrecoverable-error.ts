import { ErrorBase } from "./error-base";

/**
 * Indicates an programmin-level error that is not recoverable. The message describes
 * what happened and a developer should fix it as soon as possible.
 *
 * This is the only error a developer should `throw` instead of returning as an `Either`
 * variant.
 */
export class IrrecoverableError extends Error implements ErrorBase {
  public constructor(
    public message: string,
    cause?: Error,
  ) {
    super(message, {
      cause,
    });
  }

  public readonly errorMessageIdentifier: string =
    "core:errors:internal-error-message";

  public readonly errorType: string = IrrecoverableError.name;
}
