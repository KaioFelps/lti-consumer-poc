import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Scope } from "@nestjs/common";
import { TranslatorService } from "@/message-string/translator.service";
import { HttpRequest } from "../..";
import { serializeValidationError } from ".";
import { DTOValidationException } from "./exception";
import { DtoValidationExceptionFilterResponderFactory } from "./responder.factory";

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
  ) {}

  async catch(exception: DTOValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<HttpRequest>();
    const status = exception.getStatus();

    const errors = await serializeValidationError(
      exception.validationErrors.getErrors(),
      this.translator,
    );

    return this.responderFactory.create(request).respond(status, ctx, errors);
  }
}
