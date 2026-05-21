import { ArgumentsHost, Catch, ExceptionFilter, Injectable, Scope } from "@nestjs/common";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { SimpleExceptionPresenter } from "@/external/presenters/exceptions/simple-exception.presenter";
import { HttpRequest } from "@/lib";
import mvcRoutes from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { RenderableException } from "../renderable/exception";
import { RenderableExceptionFilter } from "../renderable/exception-filter";
import { BaseException } from "./exception";
import { BaseExceptionFilterResponderFactory } from "./responder.factory";

@Injectable({ scope: Scope.REQUEST })
@Catch(BaseException)
export class BaseExceptionFilter implements ExceptionFilter {
  public constructor(
    private readonly presenter: SimpleExceptionPresenter<BaseException>,
    private readonly translator: TranslatorService,
    private renderableExceptionFilter: RenderableExceptionFilter,
  ) {}

  async catch(exception: BaseException, host: ArgumentsHost) {
    const responderFactory = new BaseExceptionFilterResponderFactory(
      this.presenter,
      this.translator,
    );

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<HttpRequest>();
    const status = exception.getStatus();

    const shouldRender =
      request.method.toLowerCase() === "get" && request[mvcRoutes.requestKey] === true;

    if (!shouldRender) return responderFactory.create(request).respond(status, ctx, exception);

    const message = await this.translator.translate(
      exception.error.errorMessageIdentifier,
      exception.error.messageParams,
    );

    const renderableError = new RenderableError(
      {
        status: exception.getStatus(),
        view: "errors/basic",
        viewProperties: {
          title: await this.translator.translate("core:error"),
          message,
        },
      },
      exception.error.constructor.name,
    );

    this.renderableExceptionFilter.catch(new RenderableException(renderableError), host);
  }
}
