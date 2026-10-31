import { HttpStatus } from "@nestjs/common";
import { unflatten } from "flat";
import { BadRequestError } from "@/core/errors/bad-request.error.js";
import { type IErrorBase } from "@/core/errors/error-base.js";
import { ForbiddenError } from "@/core/errors/forbidden.error.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { RenderableError } from "@/core/errors/renderable/renderable-error.js";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error.js";
import { UnauthorizedError } from "@/core/errors/unauthorized.error.js";
import type { HttpRequest, RequestSession } from "@/lib.js";
import { IrrecoverableException } from "./exceptions/irrecoverable/exception.js";

export function resolveStatus(error: IErrorBase | RenderableError) {
  if (error instanceof IrrecoverableError) return HttpStatus.INTERNAL_SERVER_ERROR;

  if (error instanceof RenderableError) return error.status;

  if (error instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;

  if (error instanceof ForbiddenError) return HttpStatus.FORBIDDEN;

  if (error instanceof ResourceNotFoundError) return HttpStatus.NOT_FOUND;

  if (error instanceof BadRequestError) return HttpStatus.BAD_REQUEST;

  const irrecoverableError = new IrrecoverableError(
    `ExceptionsFactory received an unregistered error: "${error.errorType ?? error.constructor.name}".`,
  );

  throw new IrrecoverableException(irrecoverableError);
}

export function flashRequestBody(request: HttpRequest, session: RequestSession) {
  const flashValues = unflatten(request.body);

  if (session.flash) session.flash["values"] = flashValues;
  else session.flash = { values: flashValues };
}
