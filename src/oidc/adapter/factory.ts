import { Inject, Injectable } from "@nestjs/common";
import { DrizzleOIDCClientAdapter } from "@/external/data-store/drizzle/oidc-adpaters/client-adapter";
import { LtiToolsRepository } from "@/lti/lti-tools.repository";
import { Redis } from "../../external/data-store/redis/client";
import { OIDCRedisAdapter } from "../../external/data-store/redis/oidc-adapter";
import { OIDCClientsRepository } from "../repositories/clients.repository";

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

  @Inject()
  private readonly clientsRepository: OIDCClientsRepository;

  @Inject()
  private readonly ltiToolsRepository: LtiToolsRepository;

  public getAdapter(modelName: ModelName) {
    if (modelName === "Client") {
      return new DrizzleOIDCClientAdapter(
        modelName,
        this.clientsRepository,
        this.ltiToolsRepository,
      );
    }

    // TODO: persist grant with its own drizzle adapter

    return new OIDCRedisAdapter(this.redis, modelName);
  }
}
