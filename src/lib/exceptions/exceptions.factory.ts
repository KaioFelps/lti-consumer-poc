import { HttpException } from "@nestjs/common";
import { ErrorBase } from "@/core/errors/error-base";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { resolveStatus } from ".";
import { BaseException } from "./base/exception";
import { DTOValidationException } from "./dto-validation/exception";
import { IrrecoverableException } from "./irrecoverable/exception";
import { RenderableException } from "./renderable/exception";

/**
 * Directly maps an core error to its exception decorated error.
 * These exceptions worth for nothing but store the error so that their
 * filters handle the translation of each specific format of error.
 */
export abstract class ExceptionsFactory {
  public static fromError(error: ErrorBase | RenderableError): HttpException {
    if (error instanceof IrrecoverableError) {
      return new IrrecoverableException(error);
    }

    if (error instanceof InvalidArgumentError) {
      const validationErrors = new ValidationErrors();
      validationErrors.appendError(error);
      return new DTOValidationException(validationErrors);
    }

    const status = resolveStatus(error);

    if (error instanceof RenderableError) return new RenderableException(error);

    // Handle simple exceptions
    return new BaseException(error, status);
  }
}
