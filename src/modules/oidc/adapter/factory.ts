import { Injectable } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars.js";
import { DrizzleOIDCClientAdapter } from "@/external/data-store/drizzle/oidc-adpaters/client-adapter.js";
import { Redis } from "@/external/data-store/redis/client.js";
import { OIDCRedisAdapter } from "@/external/data-store/redis/oidc-adapter.js";
import { LtiToolsRepository } from "@/modules/lti/tools/lti-tools.repository.js";
import { OIDCClientsRepository } from "../repositories/clients.repository.js";
import { UnsafeOIDCClientsInjectionContainer } from "../unsafe-clients-injection-container.js";

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
  public constructor(
    private readonly redis: Redis,
    private readonly clientsRepository: OIDCClientsRepository,
    private readonly ltiToolsRepository: LtiToolsRepository,
    private readonly environmentsVar: EnvironmentVars,
    private readonly container: UnsafeOIDCClientsInjectionContainer,
  ) {}

  public getAdapter(modelName: ModelName) {
    if (modelName === "Client") {
      return new DrizzleOIDCClientAdapter(
        modelName,
        this.clientsRepository,
        this.ltiToolsRepository,
        this.environmentsVar,
        this.container,
      );
    }

    // TODO: persist grant with its own drizzle adapter

    return new OIDCRedisAdapter(this.redis, modelName);
  }
}
