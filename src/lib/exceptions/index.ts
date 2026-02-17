import { HttpStatus } from "@nestjs/common";
import { ErrorBase } from "@/core/errors/error-base";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { IrrecoverableException } from "./irrecoverable/exception";

export function resolveStatus(error: ErrorBase | RenderableError) {
  if (error instanceof IrrecoverableError) return HttpStatus.INTERNAL_SERVER_ERROR;

  if (error instanceof RenderableError) return error.status;

  if (error instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;

  if (error instanceof ResourceNotFoundError) return HttpStatus.NOT_FOUND;

  const irrecoverableError = new IrrecoverableError(
    `ExceptionsFactory received an unregistered error ${error.errorType}.`,
  );

  throw new IrrecoverableException(irrecoverableError);
}
