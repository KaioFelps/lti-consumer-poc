import { ClassProperties } from "common/src/types/class-properties";
import { MessageStringFormatterArg } from "@/message-string/internal";

export type ErrorClassProperties<Class> = Omit<ClassProperties<Class>, "errorType">;

/**
 * `ErrorBase` is the base class for every core-level error. It models
 * the minimum data every error should hold in order to be meaningful.
 *
 * Errors may add new properties as needed. Some errors might need only to
 * enforce a message params exists with valid data. They can do this in
 * several ways, such as making `messageParams` required (using
 * TypeScript's `Required` type) or adding extra properties and adding
 * them to message params inside its constructor.
 */
export abstract class ErrorBase {
  /**
   * A domain-namespaced error code that may be used by a client to find and display a
   * message string that explains this error.
   */
  public readonly errorMessageIdentifier: string;
  /**
   * Optional parameters that the message-strings module may use when formatting
   * the message identified by `errorMessageIdentifier`.
   */
  public readonly messageParams?: MessageStringFormatterArg;
  /**
   * A code that indicates the type of this error. May be used by
   * a client to determine the appropriate way to handle this error.
   */
  public readonly errorType: string;

  protected constructor(properties: ErrorClassProperties<ErrorBase>, errorType: string) {
    Object.assign(this, properties);
    this.errorType = errorType;
  }
}
