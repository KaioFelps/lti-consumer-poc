import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { HttpRequest, RequestSession } from "@/lib";

export const SessionUser = createParamDecorator(
  (_data: undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<HttpRequest>();
    const session = request["session"] as RequestSession;
    return session.auth;
  },
);
