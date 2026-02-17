import { Injectable } from "@nestjs/common";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { ExceptionPresenter } from "@/external/presenters/exception-presenter";
import { SimpleExceptionPresenter } from "@/external/presenters/exceptions/simple-exception.presenter";
import { HttpRequest, HttpResponse } from "@/lib";
import { TranslatorService } from "@/message-string/translator.service";
import { ExceptionFilterResponderFactory } from "../../exception-responders/factory";
import { ExceptionFilterResponder } from "../../exception-responders/responder";
import { BaseException } from "./exception";

type Body = BaseException;
type Output = object | void;

@Injectable()
export class BaseExceptionFilterResponderFactory extends ExceptionFilterResponderFactory<
  Body,
  Output
> {
  public constructor(
    private readonly presenter: SimpleExceptionPresenter<Body>,
    private readonly translator: TranslatorService,
  ) {
    super();
  }

  public create(request: HttpRequest): ExceptionFilterResponder<Body, Output> {
    if (this.isMVC(request)) return new MVCStrategy(this.translator);
    return new APIStrategy(this.presenter);
  }
}

class MVCStrategy extends ExceptionFilterResponder<unknown, void> {
  public constructor(private readonly t: TranslatorService) {
    super();
  }

  public async respond(_status: number, ctx: HttpArgumentsHost, exception: Body): Promise<void> {
    const request = ctx.getRequest<HttpRequest>();
    const response = ctx.getResponse<HttpResponse>();
    const session = request["session"] as Record<string, unknown>;

    const errorMessage = await this.t.translate(
      exception.error.errorMessageIdentifier,
      exception.error.messageParams,
    );

    session.error = errorMessage;
    if (session.flash) session.flash["values"] = request.body;
    else {
      session.flash = {
        values: request.body,
      };
    }

    return response.redirectBack();
  }
}

export class APIStrategy extends ExceptionFilterResponder<Body, Output> {
  public constructor(private readonly presenter: ExceptionPresenter<Body>) {
    super();
  }

  public async respond(status: number, ctx: HttpArgumentsHost, exception: Body): Promise<object> {
    return ctx
      .getResponse<HttpResponse>()
      .status(status)
      .json(await this.presenter.present(exception));
  }
}
