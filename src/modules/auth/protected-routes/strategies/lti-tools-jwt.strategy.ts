import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import Provider from "oidc-provider";
import { Strategy } from "passport-custom";
import { HttpRequest } from "@/lib";

const strategyName = "lti-tool-jwt";
export default strategyName;

@Injectable()
export class LtiToolsJwtStrategy extends PassportStrategy(Strategy, strategyName) {
  public constructor(@Inject(Provider) private readonly provider: Provider) {
    super();
  }

  public async validate(req: HttpRequest): Promise<object | false> {
    const token = this.extractBearerToken(req);

    if (!token) return false;

    const accessToken = await this.provider.ClientCredentials.find(token);
    if (!accessToken || accessToken.isExpired) return false;

    return {
      sub: accessToken.clientId,
      clientId: accessToken.clientId,
      scope: accessToken.scope,
    };
  }

  private extractBearerToken(req: HttpRequest): string | null {
    const header = req.headers?.authorization ?? "";
    if (!header.startsWith("Bearer ")) return null;
    return header.slice(7);
  }
}
