import { HttpException } from "@nestjs/common";
import { type IErrorBase } from "@/core/errors/error-base.js";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { RenderableError } from "@/core/errors/renderable/renderable-error.js";
import { ValidationErrors } from "@/core/validation/validation-errors.js";
import { resolveStatus } from "../exceptions.js";
import { BaseException } from "./base/exception.js";
import { DTOValidationException } from "./dto-validation/exception.js";
import { IrrecoverableException } from "./irrecoverable/exception.js";
import { RenderableException } from "./renderable/exception.js";

/**
 * Directly maps an core error to its exception decorated error.
 * These exceptions worth for nothing but store the error so that their
 * filters handle the translation of each specific format of error.
 */
export abstract class ExceptionsFactory {
  public static fromError(error: IErrorBase | RenderableError): HttpException {
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
