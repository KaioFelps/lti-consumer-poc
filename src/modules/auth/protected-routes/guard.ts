import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard as PassportAuthGuard } from "@nestjs/passport";
import { RenderableUnauthorizedError } from "@/core/errors/renderable/unauthorized.error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import mvcRoutes from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import protectedRoutes, { AuthStrategy } from ".";
import publicRoutes, { AuthGuardConfig } from ".";
import ltiToolsJwtStrategy from "./strategies/lti-tools-jwt.strategy";
import sessionStrategy from "./strategies/session.strategy";

@Injectable()
export class AuthGuard implements CanActivate {
  @Inject()
  private reflector!: Reflector;

  @Inject()
  private t!: TranslatorService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(
      publicRoutes.publicRouteMetadataKey,
      [context.getHandler(), context.getClass()],
    );

    if (isPublicRoute) return true;

    const guard = this.getPreferredStrategyGuard(context);

    try {
      const isAuthorized = await guard.canActivate(context);
      if (isAuthorized) return true;
    } catch (thrownError) {
      if (!(thrownError instanceof UnauthorizedException)) throw thrownError;
    }

    const isMvcRoute = this.reflector.getAllAndOverride<boolean>(mvcRoutes.metadataKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    const errorMessageIdentifier = "auth:unauthorized-access:message";

    const error = isMvcRoute
      ? new RenderableUnauthorizedError({
          view: "unauthorized",
          viewProperties: {
            title: await this.t.translate("auth:unauthorized-access:title"),
            errorMessage: await this.t.translate(errorMessageIdentifier),
            login: {
              href: "/auth/login",
              label: await this.t.translate("auth:forms:register:buttons:go-login"),
            },
          },
        })
      : new UnauthorizedError({
          errorMessageIdentifier,
        });

    throw ExceptionsFactory.fromError(error);
  }

  private getPreferredStrategyGuard(context: ExecutionContext) {
    const config = this.reflector.getAllAndOverride<AuthGuardConfig | undefined>(
      protectedRoutes.authStrategyMetadataKey,
      [context.getHandler(), context.getClass()],
    );

    const preferredAuthStrategy = config?.strategy ?? AuthStrategy.Session;

    let passportStrategy = "";
    switch (preferredAuthStrategy) {
      case AuthStrategy.LtiToolsJwt:
        passportStrategy = ltiToolsJwtStrategy;
        break;
      case AuthStrategy.Session:
        passportStrategy = sessionStrategy;
        break;
    }

    const PassportGuard = PassportAuthGuard(passportStrategy);
    return new PassportGuard();
  }
}
