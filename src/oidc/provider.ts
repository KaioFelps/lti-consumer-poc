import { Injectable } from "@nestjs/common";
import Provider, { type Configuration } from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { OIDCRedisAdapterFactory } from "@/external/data-store/redis/oidc/adapter-factory";
import { OIDCRedisAdapterBridge } from "@/external/data-store/redis/oidc/adpater-bridge";
import { AvailableACRs, AvailableScopes } from "./consts";
import { OIDCAccountsRepository } from "./repositories/accounts.repository";
import { OIDCClientsRepository } from "./repositories/clients.repository";

@Injectable()
export class OIDCProvider extends Provider {
  public static async create(
    environments: EnvironmentVars,
    clientsRepository: OIDCClientsRepository,
    oidcAccountsRepository: OIDCAccountsRepository,
    oidcAdapterFactory: OIDCRedisAdapterFactory,
  ) {
    const clients = await clientsRepository.getClients();

    // test client
    clients.push({
      client_secret: "test-client-1-secret",
      client_id: "test-client-1",
      client_name: "Test Client",
      application_type: "web",
      redirect_uris: ["http://localhost:4000/callback"],
    });

    const adapter = OIDCRedisAdapterBridge;
    adapter.setInternalAdapter(oidcAdapterFactory);

    const config = {
      adapter,
      clients,
      findAccount: async (_ctx, id, _token) => {
        return await oidcAccountsRepository.findAccountById(id);
      },
      interactions: {
        url: (_, interaction) => `/oidc/interaction/${interaction.uid}`,
      },
      acrValues: [AvailableACRs.loa1, AvailableACRs.loa0],
      scopes: [...AvailableScopes],
      features: {
        claimsParameter: { enabled: true },
        devInteractions: { enabled: false },
        clientCredentials: { enabled: true },
      },
      cookies: {
        names: {
          session: "lti_consumer_poc_oidc_session",
        },
      },
      // routes: {}
    } satisfies Configuration;

    const issuerUrl = `${environments.appUrl}/oidc`;
    return new OIDCProvider(issuerUrl, config);
  }
}
