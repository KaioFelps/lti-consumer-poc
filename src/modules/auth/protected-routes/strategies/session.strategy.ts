import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import type { HttpRequest, RequestSession } from "@/lib.js";

const strategyName = "session";
export default strategyName;

@Injectable()
export class SessionStrategy extends PassportStrategy(Strategy, strategyName) {
  public async validate(request: HttpRequest) {
    const session = request["session"] as RequestSession;

    if (!session?.auth) return false;

    return session.auth;
  }
}
