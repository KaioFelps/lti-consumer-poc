import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RenderableUnauthorizedError } from "@/core/errors/renderable/unauthorized.error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { HttpRequest, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import mvcRoutes from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import publicRoutes from ".";

@Injectable()
export class AuthGuard implements CanActivate {
  @Inject()
  private reflector: Reflector;

  @Inject()
  private t: TranslatorService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HttpRequest>();

    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(
      publicRoutes.metadataKey,
      [context.getHandler(), context.getClass()],
    );

    if (isPublicRoute) return true;

    const session = request["session"] as RequestSession;
    if (session.auth) return true;

    const isMvcRoute = this.reflector.getAllAndOverride<boolean>(
      mvcRoutes.metadataKey,
      [context.getHandler(), context.getClass()],
    );

    const errorMessageIdentifier = "auth:unauthorized-access:message";

    const error = isMvcRoute
      ? new RenderableUnauthorizedError({
          view: "unauthorized",
          viewProperties: {
            title: await this.t.translate("auth:unauthorized-access:title"),
            errorMessage: await this.t.translate(errorMessageIdentifier),
            login: {
              href: "/auth/login",
              label: await this.t.translate(
                "auth:forms:register:buttons:go-login",
              ),
            },
          },
        })
      : new UnauthorizedError({
          errorMessageIdentifier,
        });

    throw ExceptionsFactory.fromError(error);
  }
}
