import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { LtiToolJwtPayload } from "../lti-tool-jwt-payload";

export const CurrentTool = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): LtiToolJwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as LtiToolJwtPayload;
  },
);
