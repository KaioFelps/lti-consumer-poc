import { Injectable } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces/index.js";
import type { HttpRequest, HttpResponse, RequestSession } from "@/lib.js";
import { ExceptionFilterResponderFactory } from "../../exception-responders/factory.js";
import { ExceptionFilterResponder } from "../../exception-responders/responder.js";
import { flashRequestBody } from "../../exceptions.js";
import { SerializedValidationError, SerializedValidationErrorsMap } from "../dto-validation.js";

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
    const session = request["session"] as RequestSession;

    session.validationErrors = errors;
    flashRequestBody(request, session);

    return response.redirectBack();
  }
}
