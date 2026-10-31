import { HttpException } from "@nestjs/common";
import { type IErrorBase } from "@/core/errors/error-base.js";
import { RenderableError } from "@/core/errors/renderable/renderable-error.js";
import { LtilibError } from "$/core/errors/bases/ltilib.error.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { ExceptionsFactory } from "./exceptions.factory.js";
import { LtilibException } from "./ltilib/exception.js";

/**
 * Maps errors to their exceptions, including ltilib and other libraries errors.
 */
export abstract class ExtendedExceptionsFactory {
  public static fromError(
    error: IErrorBase | RenderableError | LtilibError,
  ): HttpException | LtilibException {
    if (error instanceof LtiRepositoryError) {
      return ExceptionsFactory.fromError(error.cause as IErrorBase);
    }

    if (error instanceof LtilibError) return new LtilibException(error);

    return ExceptionsFactory.fromError(error);
  }
}
