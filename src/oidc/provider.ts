import { moodleToolData } from "moodleToolData";
import { Injectable } from "@nestjs/common";
import { generateUUID } from "common/src/types/uuid";
import { either } from "fp-ts";
import Provider, { type Configuration, errors } from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { ltiToolConfigurationSchema } from "@/lti/lti-tool-config-schemas";
import { OIDCAdapterBridge } from "@/oidc/adapter/bridge";
import { OIDCAdapterFactory } from "@/oidc/adapter/factory";
import { MessageType } from "$/claims/serialization";
import { LTI_TOOL_CONFIGURATION_KEY } from "$/registration/dynamic/tool-configuration";
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
    oidcAdapterFactory: OIDCAdapterFactory,
  ) {
    const clientsResult = await clientsRepository.getClients();
    if (either.isLeft(clientsResult)) {
      throw ExceptionsFactory.fromError(clientsResult.left);
    }
    const clients = clientsResult.right.map((client) => client.asMetadata());

    // #region: test clients
    clients.push({
      client_secret: "test-client-1-secret",
      client_id: "test-client-1",
      client_name: "Test Client",
      application_type: "web",
      redirect_uris: ["http://localhost:4000/callback"],
      scope: "openid email profile",
    });
    clients.push({
      jwks_uri: moodleToolData.jwksUrl,
      client_id: moodleToolData.clientId,
      initiate_login_uri: moodleToolData.initiateLoginUrl,
      client_name: moodleToolData.clientName,
      application_type: "web",
      redirect_uris: [moodleToolData.toolUrl],
    });
    // #endregion

    const adapter = OIDCAdapterBridge;
    adapter.setInternalAdapter(oidcAdapterFactory);

    const config = {
      extraClientMetadata: {
        properties: [LTI_TOOL_CONFIGURATION_KEY],
        validator(_ctx, _key, value, _metadata) {
          const { success, error } =
            ltiToolConfigurationSchema.safeParse(value);

          if (!success) {
            const firstError = error.issues[0];
            throw new errors.InvalidClientMetadata(
              `${firstError.path.join(".")}: ${firstError.message}`,
            );
          }
        },
      },
      adapter,
      clients,
      findAccount: async (_ctx, id, _token) => {
        return await oidcAccountsRepository.findAccountById(id);
      },
      // this option specify claims returned according to given scopes
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
        registration: {
          enabled: true,
          idFactory: () => {
            return generateUUID();
          },
          initialAccessToken: false,
          issueRegistrationAccessToken: false,
        },
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
        console.debug("renderError", ctx.body);
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
    } satisfies Configuration;

    const issuerUrl = `${environments.app.url}/oidc`;
    const provider = new OIDCProvider(issuerUrl, config);

    if (environments.nodeEnv === "development") {
      provider.on("server_error", (ctx, error) => {
        console.debug("server error", ctx.url, error);
      });

      provider.on("registration_create.error", (ctx, err) => {
        console.debug("registration error", ctx.body, err);
      });

      provider.on("userinfo.error", (ctx, error) => {
        console.debug("userinfo error", error, ctx.url);
      });
    }

    return provider;
  }
}
