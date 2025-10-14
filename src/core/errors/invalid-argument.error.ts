import { ErrorBase, ErrorClassProperties } from "./error-base";

/**
 * Indicates that a given argument is not valid.
 */
export class InvalidArgumentError extends ErrorBase {
  /**
   * The name given by the client to the invalidated argument.
   */
  public argumentName?: string;

  public constructor(properties: ErrorClassProperties<InvalidArgumentError>) {
    const { argumentName, ...superProperties } = properties;
    super(superProperties, InvalidArgumentError.name);
    this.argumentName = argumentName;
  }
}
