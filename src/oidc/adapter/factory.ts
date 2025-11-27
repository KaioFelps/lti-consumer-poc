import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "../../external/data-store/redis/client";
import { OIDCRedisAdapter } from "../../external/data-store/redis/oidc-adapter";

export type ModelName =
  | "Grant"
  | "Session"
  | "AccessToken"
  | "AuthorizationCode"
  | "RefreshToken"
  | "ClientCredentials"
  | "Client"
  | "InitialAccessToken"
  | "RegistrationAccessToken"
  | "DeviceCode"
  | "Interaction"
  | "ReplayDetection"
  | "BackchannelAuthenticationRequest"
  | "PushedAuthorizationRequest";

@Injectable()
export class OIDCAdapterFactory {
  @Inject()
  private readonly redis: Redis;

  public getAdapter(modelName: ModelName) {
    return new OIDCRedisAdapter(this.redis, modelName);
  }
}
