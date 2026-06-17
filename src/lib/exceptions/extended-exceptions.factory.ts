import { HttpException } from "@nestjs/common";
import { type IErrorBase } from "@/core/errors/error-base";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { LtilibError } from "$/core/errors/bases/ltilib.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { ExceptionsFactory } from "./exceptions.factory";
import { LtilibException } from "./ltilib/exception";

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
