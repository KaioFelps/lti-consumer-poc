import { HttpException } from "@nestjs/common";
import { ErrorBase } from "@/core/errors/error-base";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { DTOValidationException } from "./dto-validation/exception";
import { IrrecoverableException } from "./irrecoverable/exception";
import { ResourceNotFoundException } from "./resource-not-found/exception";
import { UnauthorizedException } from "./unauthorized/exception";

/**
 * Directly maps an core error to its exception decorated error.
 * These exceptions worth for nothing but store the error so that their
 * filters handle the translation of each specific format of error.
 */
export abstract class ExceptionFactory {
  public static fromError(error: ErrorBase): HttpException {
    if (error instanceof ResourceNotFoundError) {
      return new ResourceNotFoundException(error);
    }

    if (error instanceof UnauthorizedError) {
      return new UnauthorizedException(error);
    }

    if (error instanceof IrrecoverableError) {
      return new IrrecoverableException(error);
    }

    if (error instanceof InvalidArgumentError) {
      const validationErrors = new ValidationErrors();
      validationErrors.appendError(error);
      return new DTOValidationException(validationErrors);
    }

    throw new IrrecoverableError(
      `ExceptionFactory received an unregistered error ${error.constructor.name}.`,
    );
  }
}
