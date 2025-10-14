import { ClassProperties } from "common/src/types/class-properties";

export type ErrorClassProperties<Class> = Omit<
  ClassProperties<Class>,
  "errorType"
>;

export abstract class ErrorBase {
  /**
   * A namespaced error code that may be used by a client to find and display a
   * message string that explains this error.
   */
  public readonly errorMessageIdentifier: string;
  /**
   * A code that indicates the type of this error. May be used by
   * a client to determine the appropriate way to handle this error.
   */
  public readonly errorType: string;

  protected constructor(
    properties: ErrorClassProperties<ErrorBase>,
    errorType: string,
  ) {
    Object.assign(this, properties);
    this.errorType = errorType;
  }
}
