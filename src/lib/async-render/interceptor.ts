import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import {
  RESPONSE_PASSTHROUGH_METADATA,
  ROUTE_ARGS_METADATA,
} from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { Reflector } from "@nestjs/core";
import {
  ORIGINAL_RENDER_FN,
  RenderFn,
  renderWithLayout,
} from "express-ejs-layouts";
import { Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { HttpRequest, HttpResponse } from "..";
import asyncRender from ".";

@Injectable()
export class AsyncRenderInterceptor implements NestInterceptor {
  public constructor(private reflector: Reflector) {}

  private isInLibraryMode(context: ExecutionContext) {
    const handler = context.getHandler();
    const controller = context.getClass();
    const methodName = handler.name;

    const hasPassthroughEnabled =
      Reflect.getMetadata(
        RESPONSE_PASSTHROUGH_METADATA,
        controller,
        methodName,
      ) === true;

    const handlerArguments =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, methodName) ?? {};

    const hasManualResponse = Object.keys(handlerArguments).some((key) => {
      const [_parameterType] = key.split(":");
      const parameterType = Number(_parameterType);

      return (
        parameterType === RouteParamtypes.RESPONSE ||
        parameterType === RouteParamtypes.NEXT
      );
    });

    return hasManualResponse && !hasPassthroughEnabled;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const view = this.reflector.get<string>(
      asyncRender.metadataKey,
      context.getHandler(),
    );

    if (!view || this.isInLibraryMode(context)) return next.handle();

    return next.handle().pipe(
      mergeMap(async (data) => {
        const request = context.switchToHttp().getRequest<HttpRequest>();
        const response = context.switchToHttp().getResponse<HttpResponse>();
        const html = await new Promise<string>((resolve, reject) => {
          const renderFunction =
            ORIGINAL_RENDER_FN in response
              ? (response[ORIGINAL_RENDER_FN] as RenderFn)
              : (response.render as RenderFn);

          renderWithLayout(
            renderFunction.bind(response),
            request,
            response,
            view,
            data,
            (err, html) => {
              if (err) return reject(err);
              return resolve(html!);
            },
          );
        });

        return html;
      }),
    );
  }
}
