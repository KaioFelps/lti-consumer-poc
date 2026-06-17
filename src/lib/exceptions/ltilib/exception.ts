import { IntrinsicException } from "@nestjs/common";
import { type ILtilibError } from "$/core/errors/bases/ltilib.error";

/**
 * A wrapper for every _ltilib_ error. They are to be treated in the
 * exception filter level.
 *
 * These errors won't obey any restriction regarding whether the endpoint
 * is MVC or RESTful, but only those constraints stated by LTI
 * specifications.
 */
export class LtilibException extends IntrinsicException {
  public constructor(public readonly innerError: ILtilibError) {
    super(innerError.message, { cause: innerError });
  }
}
