import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { IS_MVC_ROUTE } from "@/lib/decorators/mvc-route";

export const HANDLER_IS_MVC_KEY = "__handler_metadata_is_mvc";

/**
 * This interceptor attaches handler and controller data to the request object
 * so that exception filters can access it and use to extract metadata.
 * This is needed so that they know whether the handler is a MVC or a regular API
 * route, thus discovering how to display the filtered error.
 */
@Injectable()
export class MvcMarkerInterceptor implements NestInterceptor {
  public constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();

    const handler = context.getHandler();
    const controller = context.getClass();

    const isMVCRoute = this.reflector.getAllAndOverride<boolean>(IS_MVC_ROUTE, [
      handler,
      controller,
    ]);

    request[HANDLER_IS_MVC_KEY] = isMVCRoute;

    return next.handle();
  }
}
