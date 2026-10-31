import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { HttpRequest, RequestSession } from "@/lib.js";

export const SessionUser = createParamDecorator((_data: undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<HttpRequest>();
  const session = request["session"] as RequestSession;
  return session.auth;
});
