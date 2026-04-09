import { ClassProperties } from "common/src/types/class-properties";
import { MessageStringFormatterArg } from "@/message-string/internal";

export type ErrorClassProperties<Class> = Omit<ClassProperties<Class>, "errorType">;

export interface IErrorBase {
  /**
   * A domain-namespaced error code that may be used by a client to find and display a
   * message string that explains this error.
   */
  errorMessageIdentifier: string;
  /**
   * Optional parameters that the message-strings module may use when formatting
   * the message identified by `errorMessageIdentifier`.
   */
  messageParams?: MessageStringFormatterArg;
  /**
   * A code that indicates the type of this error. May be used by
   * a client to determine the appropriate way to handle this error.
   */
  errorType: string;
}

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
export abstract class ErrorBase implements IErrorBase {
  protected _errorMessageIdentifier: string;
  protected _messageParams?: MessageStringFormatterArg;
  protected _errorType: string;

  protected constructor(props: Omit<IErrorBase, "errorType">, errorType: string) {
    this._errorMessageIdentifier = props.errorMessageIdentifier;
    this._errorType = errorType;
    this._messageParams = props.messageParams;
  }

  public get errorMessageIdentifier() {
    return this._errorMessageIdentifier;
  }

  public get messageParams() {
    return this._messageParams;
  }

  public get errorType() {
    return this._errorType;
  }
}
