import { HttpStatus } from "@nestjs/common";
import { unflatten } from "flat";
import { BadRequestError } from "@/core/errors/bad-request.error";
import { type IErrorBase } from "@/core/errors/error-base";
import { ForbiddenError } from "@/core/errors/forbidden.error";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { HttpRequest, RequestSession } from "..";
import { IrrecoverableException } from "./irrecoverable/exception";

export function resolveStatus(error: IErrorBase | RenderableError) {
  if (error instanceof IrrecoverableError) return HttpStatus.INTERNAL_SERVER_ERROR;

  if (error instanceof RenderableError) return error.status;

  if (error instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;

  if (error instanceof ForbiddenError) return HttpStatus.FORBIDDEN;

  if (error instanceof ResourceNotFoundError) return HttpStatus.NOT_FOUND;

  if (error instanceof BadRequestError) return HttpStatus.BAD_REQUEST;

  const irrecoverableError = new IrrecoverableError(
    `ExceptionsFactory received an unregistered error ${error.errorType}.`,
  );

  throw new IrrecoverableException(irrecoverableError);
}

export function flashRequestBody(request: HttpRequest, session: RequestSession) {
  const flashValues = unflatten(request.body);

  if (session.flash) session.flash["values"] = flashValues;
  else session.flash = { values: flashValues };
}
