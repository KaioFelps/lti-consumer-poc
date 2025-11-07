import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Inject,
  Injectable,
  Scope,
} from "@nestjs/common";
import { HttpRequest } from "@/lib";
import { BaseException } from "./exception";
import { BaseExceptionFilterResponderFactory } from "./responder.factory";

@Injectable({ scope: Scope.REQUEST })
@Catch(BaseException)
export class BaseExceptionFilter implements ExceptionFilter {
  @Inject()
  private responderFactory: BaseExceptionFilterResponderFactory;

  async catch(exception: BaseException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<HttpRequest>();
    const status = exception.getStatus();

    return this.responderFactory
      .create(request)
      .respond(status, ctx, exception);
  }
}
