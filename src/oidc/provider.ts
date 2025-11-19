import { Injectable } from "@nestjs/common";
import Provider, { type Configuration } from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { OIDCRedisAdapterFactory } from "@/external/data-store/redis/oidc/adapter-factory";
import { OIDCRedisAdapterBridge } from "@/external/data-store/redis/oidc/adpater-bridge";
import { MessageType } from "$/claims/serialization";
import { MessagePlacement } from "$/registration/enums/message-placement";
import { PlatformConfigurationMetadata } from "$/registration/platform-configuration-metadata";
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
      // this option specify claims returned according to scopes given
      claims: {
        email: ["email"],
        profile: [
          "birthdate",
          "family_name",
          "gender",
          "given_name",
          "locale",
          "name",
          "nickname",
        ],
      },
      interactions: {
        url: (_, interaction) => `/oidc/interaction/${interaction.uid}`,
      },
      acrValues: [AvailableACRs.loa1, AvailableACRs.loa0],
      scopes: AvailableScopes as string[],
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
      // values are expected to be seconds
      ttl: {
        Session: 60 * 60 * 24, // 1 day
        Interaction: 60 * 5, // 5 minutes,
      },
      renderError: async (ctx, out, error) => {
        console.debug(ctx.body);
        console.debug(error);
        ctx.body = out;
      },
      discovery: new PlatformConfigurationMetadata({
        version: process.env.npm_package_version ?? "development",
        messagesSupported: [
          { type: MessageType.resourceLink },
          {
            type: MessageType.deepLinking,
            placements: [MessagePlacement.ContentArea],
          },
        ],
        productFamilyCode: environments.app.productCode,
      }).intoConfiguration(),

      // routes: {}
    } satisfies Configuration;

    const issuerUrl = `${environments.app.url}/oidc`;
    const provider = new OIDCProvider(issuerUrl, config);

    provider.on("server_error", (ctx, error) => {
      console.debug("server error", ctx.url, error);
    });

    provider.on("userinfo.error", (ctx, error) => {
      console.debug("userinfo error", error, ctx.url);
    });

    return provider;
  }
}
