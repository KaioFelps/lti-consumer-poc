import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { HttpRequest } from "..";
import coreValidation, { CoreValidationConfig } from ".";

@Injectable()
export class CoreValidationInterceptor implements NestInterceptor {
  public constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<HttpRequest>();

    const config = this.reflector.getAllAndOverride<CoreValidationConfig>(
      coreValidation.metadataKey,
      [context.getClass(), context.getHandler()],
    );

    coreValidation.attachConfigsToRequest(request, config);

    return next.handle();
  }
}
