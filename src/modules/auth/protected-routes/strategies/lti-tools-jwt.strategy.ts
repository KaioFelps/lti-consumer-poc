import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthJwkSet } from "../../encryption/jwks-set";

const strategyName = "lti-tool-jwt";
export default strategyName;

@Injectable()
export class LtiToolsJwtStrategy extends PassportStrategy(Strategy, strategyName) {
  public constructor(@Inject(AuthJwkSet) jwks: AuthJwkSet) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwks.publicPem,
    });
  }

  public async validate(token: object) {
    return token as LtiToolsJwtStrategy;
  }
}
