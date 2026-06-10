import { IErrorBase } from "@/core/errors/error-base";
import { MessageStringFormatterArg } from "@/message-string/internal";
import { LtilibError } from "$/core/errors/bases/ltilib.error";
import { LtilibException } from "./exception";
import { LtilibExceptionFilter } from "./exception-filter";

/**
 * A adapter used to leverage already existing `BaseExceptionFilter`
 * and handle generic ltilib errors.
 *
 * @note Don't use it. It's supposed to be used by {@link LtilibExceptionFilter `LtilibExceptionFilter`}
 * only. Wrap your ltilib error with {@link LtilibException `LtilibException`}
 * and then throw it instead.
 *
 * @internal
 */
export class BaseErrorLtilibAdapter implements IErrorBase {
  public readonly errorMessageIdentifier: string;
  public readonly messageParams?: MessageStringFormatterArg | undefined;
  public readonly errorType: string;

  public constructor(ltilibError: LtilibError) {
    this.errorType = ltilibError.constructor.name;
    this.errorMessageIdentifier = "core:pass-through";
    this.messageParams = { message: ltilibError.message };
  }
}
