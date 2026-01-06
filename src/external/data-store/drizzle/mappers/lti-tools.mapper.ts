import type * as schema from "drizzle/schema";
import type {
  BuildQueryResult,
  DBQueryConfig,
  ExtractTablesWithRelations,
} from "drizzle-orm";
import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { Contact, GrantType } from "$/registration/dynamic/tool-configuration";
import { MessagePlacement } from "$/registration/enums/message-placement";
import { ToolRecord } from "$/registration/tool-record";
import { ToolSupportedMessage } from "$/registration/tool-supported-message";

type Schema = ExtractTablesWithRelations<typeof schema>;

type LtiToolsQueryConfig = DBQueryConfig<
  "many",
  boolean,
  Schema,
  Schema["ltiTools"]
>;

type LtiToolRow = BuildQueryResult<
  Schema,
  Schema["ltiTools"],
  typeof requiredQueryConfig
>;

const requiredQueryConfig = {
  with: {
    deployments: true,
    oauthClient: { with: { contacts: true, redirectUris: true } },
    supportedMessages: { with: { roles: true } },
  },
} as const satisfies LtiToolsQueryConfig;

function fromRow(row: LtiToolRow): ToolRecord {
  return ToolRecord.createUnchecked({
    applicationType: row.oauthClient.applicationType as "web",
    contacts: row.oauthClient.contacts.map(
      (contact) => contact.email as Contact,
    ),
    grantTypes: row.grantTypes.split(" ") as GrantType[],
    id: row.id,
    ltiConfiguration: {
      claims: row.claims.split(" "),
      deploymentsIds: row.deployments.map((deployment) => deployment.id),
      domain: row.domain,
      messages: row.supportedMessages.map(
        (message) =>
          ({
            type: message.type as MessageType,
            customParameters: message.customParameters as Record<
              string,
              string
            >,
            iconUri: message.iconUri ?? undefined,
            label: message.label ?? undefined,
            placements:
              message.placements
                ?.split(" ")
                .map((placement) => placement as MessagePlacement) ?? undefined,
            roles:
              message.roles?.length === 0
                ? undefined
                : message.roles.map((role) => role.role as AnyLtiRole),
            targetLinkUri: message.targetLinkUri ?? undefined,
          }) satisfies ToolSupportedMessage,
      ),
      targetLinkUri: row.targetLinkUri,
      customParameters: row.customParameters as Record<string, string>,
      description: row.description ?? undefined,
    },
    name: row.oauthClient.name,
    responseTypes: row.responseTypes.split(" ") as "id_token"[],
    scope: row.oauthClient.scopes,
    tokenEndpointAuthMethod: "private_key_jwt",
    uris: {
      initiate: row.initiateUri,
      jwks: row.oauthClient.jwksUri,
      redirect: row.oauthClient.redirectUris.map(({ uri }) => uri),
      homePage: row.homePageUri ?? undefined,
      logo: row.logoUri ?? undefined,
      policy: row.policyUri ?? undefined,
      tos: row.tosUri ?? undefined,
    },
    clientSecret: row.oauthClient.clientSecret ?? undefined,
  });
}

function intoRow(tool: ToolRecord): LtiToolRow {
  return {
    id: tool.id,
    claims: tool.ltiConfiguration.claims.join(" "),
    customParameters: tool.ltiConfiguration.customParameters,
    domain: tool.ltiConfiguration.domain,
    grantTypes: tool.grantTypes.join(" "),
    initiateUri: tool.uris.initiate,
    responseTypes: tool.responseTypes.join(" "),
    targetLinkUri: tool.ltiConfiguration.targetLinkUri,
    description: tool.ltiConfiguration.description ?? null,
    homePageUri: tool.uris.homePage ?? null,
    logoUri: tool.uris.logo ?? null,
    policyUri: tool.uris.policy ?? null,
    tosUri: tool.uris.tos ?? null,

    oauthClient: {
      id: tool.id,
      applicationType: tool.applicationType,
      jwksUri: tool.uris.jwks,
      name: tool.name,
      scopes: tool.scope,
      clientSecret: tool.clientSecret ?? null,
      redirectUris: tool.uris.redirect.map((uri) => ({
        uri,
        clientId: tool.id,
      })),
      contacts:
        tool.contacts?.map((email) => ({ clientId: tool.id, email })) ?? [],
    },

    deployments: tool.ltiConfiguration.deploymentsIds.map((deploymentId) => ({
      clientId: tool.id,
      id: deploymentId,
    })),

    supportedMessages: tool.ltiConfiguration.messages.map((message) => ({
      clientId: tool.id,
      type: message.type,
      customParameters: message.customParameters ?? null,
      iconUri: message.iconUri ?? null,
      label: message.label ?? null,
      placements: message.placements?.join(" ") ?? null,
      targetLinkUri: message.targetLinkUri ?? null,
      roles:
        message.roles?.map((role) => ({
          clientId: tool.id,
          messageType: message.type,
          role,
        })) ?? [],
    })),
  };
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
