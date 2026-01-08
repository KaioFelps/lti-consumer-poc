import { generateUUID } from "common/src/types/uuid";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import Provider, { type Configuration, errors } from "oidc-provider";
import { AuthJwkSet } from "@/auth/encryption/jwks-set";
import { EnvironmentVars } from "@/config/environment-vars";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { eitherPromiseToTaskEither } from "@/lib/fp-ts";
import { LtiToolIdPrefix } from "@/lti";
import { ltiToolConfigurationSchema } from "@/lti/lti-tool-config-schemas";
import { LtiToolsRepository } from "@/lti/lti-tools.repository";
import { OIDCAdapterBridge } from "@/oidc/adapter/bridge";
import { OIDCAdapterFactory } from "@/oidc/adapter/factory";
import { MessageType } from "$/claims/serialization";
import { LTI_TOOL_CONFIGURATION_KEY } from "$/registration/dynamic/tool-configuration";
import { MessagePlacement } from "$/registration/enums/message-placement";
import { PlatformConfigurationMetadata } from "$/registration/platform-configuration-metadata";
import { ODICClientIdPrefix } from ".";
import { AvailableACRs, AvailableScopes } from "./consts";
import { OIDCAccountsRepository } from "./repositories/accounts.repository";
import { OIDCClientsRepository } from "./repositories/clients.repository";

export class OIDCProviderFactory {
  public constructor(
    private environments: EnvironmentVars,
    private clientsRepository: OIDCClientsRepository,
    private ltiToolsRepository: LtiToolsRepository,
    private oidcAccountsRepository: OIDCAccountsRepository,
    private oidcAdapterFactory: OIDCAdapterFactory,
    private jwks: AuthJwkSet,
  ) {}

  public async create(): Promise<Provider> {
    const adapter = OIDCAdapterBridge;
    adapter.setInternalAdapter(this.oidcAdapterFactory);

    const clients = await this.getClientsAndLtiTools();
    clients.push({
      client_secret: "test-client-1-secret",
      client_id: "test-client-1",
      client_name: "Test Client",
      application_type: "web",
      redirect_uris: ["http://localhost:4000/callback"],
      scope: "openid email profile",
    });

    const config = {
      extraClientMetadata: {
        properties: [LTI_TOOL_CONFIGURATION_KEY],
        validator(_ctx, key, value, _metadata) {
          if (key === LTI_TOOL_CONFIGURATION_KEY) {
            if (!value) return;

            const { success, error } =
              ltiToolConfigurationSchema.safeParse(value);

            if (!success) {
              const firstError = error.issues[0];
              throw new errors.InvalidClientMetadata(
                `${firstError.path.join(".")}: ${firstError.message}`,
              );
            }
          }
        },
      },
      adapter,
      jwks: this.jwks.toPrivateKeyset(),
      clients,
      findAccount: async (_ctx, id, _token) => {
        return await this.oidcAccountsRepository.findAccountById(id);
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
          idFactory: (ctx) => {
            const isLtiTool =
              LTI_TOOL_CONFIGURATION_KEY in (ctx.oidc.body ?? {});

            /**
             * We ensure every tool or client be prefixed according to what it its.
             * This allows further calls to perform explicit routines specific to
             * fetching and mounting LTI tools or more simple routines only to fetch
             * Open ID client (which contain only a subset of LTI Tool properties).
             */
            const prefix = isLtiTool ? LtiToolIdPrefix : ODICClientIdPrefix;

            let id = generateUUID();
            id = `${prefix}${id}`;
            return id;
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
        productFamilyCode: this.environments.app.productCode,
      }).intoConfiguration(),
    } satisfies Configuration;

    const issuerUrl = `${this.environments.app.url}/oidc`;
    const provider = new Provider(issuerUrl, config);

    if (this.environments.nodeEnv === "development") {
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

  private async getClientsAndLtiTools() {
    return await pipe(
      eitherPromiseToTaskEither(() => this.ltiToolsRepository.findManyTools()),
      taskEither.map((tools) => tools.map((tool) => tool.asClientMetadata())),
      taskEither.map((tools) => {
        return pipe(
          eitherPromiseToTaskEither(() => this.clientsRepository.getClients()),
          taskEither.map((clients) =>
            clients.map((client) => client.asClientMetadata()),
          ),
          taskEither.map((clients) => [...tools, ...clients]),
        );
      }),
      taskEither.flattenW,
      taskEither.match(
        (error) => {
          throw ExceptionsFactory.fromError(error);
        },
        (clientMetaData) => clientMetaData,
      ),
    )();
  }
}
