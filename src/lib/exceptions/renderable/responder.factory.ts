import { Injectable } from "@nestjs/common";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { HttpRequest, HttpResponse } from "@/lib";
import { ExceptionFilterResponderFactory } from "../../exception-responders/factory";
import { ExceptionFilterResponder } from "../../exception-responders/responder";
import { RenderableException } from "./exception";

type Body = RenderableException;
type Output = object | void;

@Injectable()
export class RenderableExceptionFilterResponderFactory extends ExceptionFilterResponderFactory<
  Body,
  Output
> {
  public create(request: HttpRequest): ExceptionFilterResponder<Body, Output> {
    if (this.isMVC(request)) return new MVCStrategy();

    throw new IrrecoverableError(
      `Tried to throw a renderable error from a REST route (${request.originalUrl}).`,
    );
  }
}

class MVCStrategy extends ExceptionFilterResponder<unknown, void> {
  public async respond(_status: number, ctx: HttpArgumentsHost, exception: Body): Promise<void> {
    const response = ctx.getResponse<HttpResponse>();

    const renderableError = exception.error;

    return response
      .status(exception.getStatus())
      .render(renderableError.view, renderableError.viewProperties);
  }
}
