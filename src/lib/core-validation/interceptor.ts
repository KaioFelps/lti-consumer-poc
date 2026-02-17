import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { PARAMTYPES_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { HttpRequest } from "..";
import coreValidation, { type CoreValidationConfig } from ".";

@Injectable()
export class CoreValidationInterceptor implements NestInterceptor {
  public constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const targets = [context.getClass(), ...this.getDtoTargets(context), context.getHandler()];

    const config = this.getMergedValidatorConfigurations(targets);

    const request = context.switchToHttp().getRequest<HttpRequest>();
    coreValidation.attachConfigsToRequest(request, config);

    return next.handle();
  }

  // biome-ignore lint/suspicious/noExplicitAny: NestJs targets *has* any type
  private getMergedValidatorConfigurations(targets: any[]) {
    const config = this.reflector.getAllAndMerge<CoreValidationConfig>(
      coreValidation.metadataKey,
      targets,
    );

    return config;
  }

  private getDtoTargets(context: ExecutionContext) {
    const paramTypes =
      Reflect.getMetadata(PARAMTYPES_METADATA, context.getClass(), context.getHandler().name) || [];

    const dtoTargets = paramTypes.filter((paramType) => {
      return (
        paramType &&
        typeof paramType === "function" &&
        this.reflector.get(coreValidation.metadataKey, paramType)
      );
    });

    return dtoTargets;
  }
}
