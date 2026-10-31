import { ArgumentsHost, Catch, ExceptionFilter, Inject, Injectable, Scope } from "@nestjs/common";
import { RenderableError } from "@/core/errors/renderable/renderable-error.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { serializeValidationError } from "../dto-validation.js";
import { RenderableException } from "../renderable/exception.js";
import { RenderableExceptionFilter } from "../renderable/exception-filter.js";
import { RenderableDtoValidationException } from "./exception.js";

@Injectable({ scope: Scope.REQUEST })
@Catch(RenderableDtoValidationException)
export class RenderableDtoValidationExceptionFilter implements ExceptionFilter {
  @Inject()
  private t!: TranslatorService;

  @Inject()
  private renderableExceptionFilter!: RenderableExceptionFilter;

  async catch(exception: RenderableDtoValidationException, host: ArgumentsHost) {
    const status = exception.getStatus();

    const errors = await serializeValidationError(exception.validationErrors.getErrors(), this.t);

    const renderableError = new RenderableError(
      {
        view: exception.view,
        viewProperties: {
          title: await this.t.translate("core:errors:dto-validation-title"),
          foo: { oi: "oi" },
          errors,
        },
        status,
      },
      exception.validationErrors.constructor.name,
    );

    const renderableException = new RenderableException(renderableError);

    return this.renderableExceptionFilter.catch(renderableException, host);
  }
}
