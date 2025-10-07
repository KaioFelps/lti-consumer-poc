import { ErrorBase } from "./error-base";

/**
 * Indicates that a given argument is not valid.
 */
export class InvalidArgumentError extends ErrorBase {
  public constructor(
    public readonly errorMessageIdentifier: string,
    public argumentName?: string,
  ) {
    super(InvalidArgumentError.name);
  }
}
