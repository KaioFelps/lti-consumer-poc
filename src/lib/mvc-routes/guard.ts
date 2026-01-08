import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import mvc from ".";

/**
 * This guard attaches handler and controller data to the request object
 * so that exception filters can access it and use to extract metadata.
 * This is needed so that they know whether the handler is a MVC or a regular API
 * route, thus discovering how to display the filtered error.
 */
@Injectable()
export class MvcGuard implements CanActivate {
  @Inject()
  private reflector: Reflector;

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    const handler = context.getHandler();
    const controller = context.getClass();

    const isMVCRoute = this.reflector.getAllAndOverride<boolean>(
      mvc.metadataKey,
      [handler, controller],
    );

    request[mvc.requestKey] = isMVCRoute;

    return true;
  }
}
