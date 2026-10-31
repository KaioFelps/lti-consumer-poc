import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Scope } from "@nestjs/common";
import mvcRoutes from "@/lib/mvc-routes.js";
import type { HttpRequest } from "@/lib.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { serializeValidationError } from "../dto-validation.js";
import { RenderableDtoValidationException } from "../renderable-dto-validation/exception.js";
import { RenderableDtoValidationExceptionFilter } from "../renderable-dto-validation/exception-filter.js";
import { DTOValidationException } from "./exception.js";
import { DtoValidationExceptionFilterResponderFactory } from "./responder.factory.js";

/**
 * This exception filter translates and present every (nested) error from a
 * `DTOValidationException` thrown by some handler across the application.
 */
@Injectable({ scope: Scope.REQUEST })
@Catch(DTOValidationException)
export class DTOValidationExceptionFilter implements ExceptionFilter {
  public constructor(
    private readonly translator: TranslatorService,
    private readonly responderFactory: DtoValidationExceptionFilterResponderFactory,
    private readonly renderableFitler: RenderableDtoValidationExceptionFilter,
  ) {}

  async catch(exception: DTOValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<HttpRequest>();
    const status = exception.getStatus();

    const errors = await serializeValidationError(
      exception.validationErrors.getErrors(),
      this.translator,
    );

    const shouldRender = request.method.toLowerCase() === "get" && request[mvcRoutes.requestKey];

    if (!shouldRender) return this.responderFactory.create(request).respond(status, ctx, errors);

    const renderableDtoException = new RenderableDtoValidationException(
      exception.validationErrors,
      "dto-validation-error",
      exception.getStatus(),
    );

    this.renderableFitler.catch(renderableDtoException, host);
  }
}
