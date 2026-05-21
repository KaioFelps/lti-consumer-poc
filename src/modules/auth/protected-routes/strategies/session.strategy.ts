import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { HttpRequest, RequestSession } from "@/lib";

const strategyName = "session";
export default strategyName;

@Injectable()
export class SessionStrategy extends PassportStrategy(Strategy, strategyName) {
  public async validate(request: HttpRequest) {
    console.log("chamou o sessions");
    const session = request["session"] as RequestSession;
    console.debug(session);

    if (!session?.auth) return false;

    return session.auth;
  }
}
