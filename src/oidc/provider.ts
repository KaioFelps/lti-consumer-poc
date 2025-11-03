import { Injectable } from "@nestjs/common";
import Provider, { type Configuration } from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { AvailableACRs, AvailableScopes } from "./consts";
import { OIDCAccountsRepository } from "./repositories/accounts.repository";
import { OIDCClientsRepository } from "./repositories/clients.repository";

@Injectable()
export class OIDCProvider extends Provider {
  public static async create(
    environments: EnvironmentVars,
    clientsRepository: OIDCClientsRepository,
    oidcAccountsRepository: OIDCAccountsRepository,
  ) {
    const clients = await clientsRepository.getClients();

    const config = {
      clients,
      findAccount: async (_ctx, id, _token) => {
        return await oidcAccountsRepository.findAccountById(id);
      },
      interactions: {
        url: (_, interaction) => `/oidc/interaction/${interaction.uid}`,
      },
      acrValues: [AvailableACRs.loa1, AvailableACRs.loa0],
      scopes: [...AvailableScopes],
    } satisfies Configuration;

    console.log(environments.appUrl);
    return new OIDCProvider(environments.appUrl, config);
  }
}
