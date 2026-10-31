import { ArgumentsHost, Catch, ExceptionFilter, Inject, Injectable, Scope } from "@nestjs/common";
import type { HttpRequest } from "@/lib.js";
import { RenderableException } from "./exception.js";
import { RenderableExceptionFilterResponderFactory } from "./responder.factory.js";

@Injectable({ scope: Scope.REQUEST })
@Catch(RenderableException)
export class RenderableExceptionFilter implements ExceptionFilter {
  @Inject()
  private responderFactory: RenderableExceptionFilterResponderFactory;

  async catch(exception: RenderableException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<HttpRequest>();
    const status = exception.getStatus();

    return this.responderFactory.create(request).respond(status, ctx, exception);
  }
}
