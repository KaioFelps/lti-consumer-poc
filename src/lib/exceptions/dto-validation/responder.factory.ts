import { Injectable } from "@nestjs/common";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { HttpRequest, HttpResponse } from "@/lib";
import { ExceptionFilterResponderFactory } from "../../exception-responders/factory";
import { ExceptionFilterResponder } from "../../exception-responders/responder";
import { SerializedValidationError, SerializedValidationErrorsMap } from ".";

type Body = SerializedValidationErrorsMap | SerializedValidationError[];
type Output = void;

@Injectable()
export class DtoValidationExceptionFilterResponderFactory extends ExceptionFilterResponderFactory<
  Body,
  Output
> {
  public create(request: HttpRequest) {
    if (this.isMVC(request)) return new MvcResponder();
    return new ApiResponder();
  }
}

export class ApiResponder extends ExceptionFilterResponder<Body, Output> {
  public override async respond(status: number, ctx: HttpArgumentsHost, body: Body) {
    return ctx.getResponse().status(status).json({ errors: body, status });
  }
}

export class MvcResponder extends ExceptionFilterResponder<Body, Output> {
  public override async respond(_status: number, ctx: HttpArgumentsHost, errors: Body) {
    const request = ctx.getRequest<HttpRequest>();
    const response = ctx.getResponse<HttpResponse>();
    const session = request["session"] as Record<string, unknown>;

    session.validationErrors = errors;
    if (session.flash) session.flash["values"] = request.body;
    else {
      session.flash = {
        values: request.body,
      };
    }

    return response.redirectBack();
  }
}
