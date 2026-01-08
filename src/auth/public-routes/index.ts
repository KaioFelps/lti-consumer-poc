import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { HttpRequest, RequestSession } from "@/lib";
import { AuthGuard } from "./guard";

const IS_PUBLIC_ROUTE = "isPublicRoute";

export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);

export const SessionUser = createParamDecorator(
  (_data: undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<HttpRequest>();
    const session = request["session"] as RequestSession;
    return session.auth;
  },
);

export default {
  Guard: AuthGuard,
  metadataKey: IS_PUBLIC_ROUTE,
};
