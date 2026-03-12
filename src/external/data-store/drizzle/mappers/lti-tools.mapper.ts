import type * as schema from "drizzle/schema";
import type { BuildQueryResult, DBQueryConfig, ExtractTablesWithRelations } from "drizzle-orm";
import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { LtiTool } from "$/core/tool";
import { MessagePlacement } from "$/core/tool/message-placement";
import { Contact, GrantType } from "$/registration/dynamic/tool-configuration";

type Schema = ExtractTablesWithRelations<typeof schema>;

type LtiToolsQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["ltiTools"]>;

type LtiToolRow = BuildQueryResult<Schema, Schema["ltiTools"], typeof requiredQueryConfig>;

type LtiToolRowWithoutDeployments = Omit<LtiToolRow, "deployments">;

const requiredQueryConfig = {
  with: {
    deployments: { columns: { id: true } },
    oauthClient: { with: { contacts: true, redirectUris: true } },
    supportedMessages: { with: { roles: true } },
  },
} as const satisfies LtiToolsQueryConfig;

function fromRow(row: LtiToolRow): LtiTool {
  return LtiTool.createUnchecked({
    applicationType: row.oauthClient.applicationType as "web",
    contacts: row.oauthClient.contacts.map((contact) => contact.email as Contact),
    grantTypes: row.grantTypes.split(" ") as GrantType[],
    id: row.id,
    claims: row.claims.split(" "),
    deploymentsIds: row.deployments.map((deployment) => deployment.id),
    domain: row.domain,
    messages: row.supportedMessages.map(
      (message) =>
        ({
          type: message.type as MessageType,
          customParameters: message.customParameters as Record<string, string>,
          iconUri: message.iconUri ?? undefined,
          label: message.label ?? undefined,
          placements:
            message.placements?.split(" ").map((placement) => placement as MessagePlacement) ??
            undefined,
          roles:
            message.roles?.length === 0
              ? undefined
              : message.roles.map((role) => role.role as AnyLtiRole),
          targetLinkUri: message.targetLinkUri ? new URL(message.targetLinkUri) : undefined,
        }) satisfies LtiTool.SupportedMessage,
    ),
    targetLinkUri: new URL(row.targetLinkUri),
    customParameters: row.customParameters as Record<string, string>,
    description: row.description ?? undefined,
    name: row.oauthClient.name,
    responseTypes: row.responseTypes.split(" ") as "id_token"[],
    scopes: row.oauthClient.scopes.split(" "),
    tokenEndpointAuthMethod: "private_key_jwt",
    initiateUrl: new URL(row.initiateUri),
    jwksUrl: new URL(row.oauthClient.jwksUri),
    redirectUrls: row.oauthClient.redirectUris.map(({ uri }) => uri),
    homePageUrl: row.homePageUri ? new URL(row.homePageUri) : undefined,
    logoUrl: row.logoUri ? new URL(row.logoUri) : undefined,
    policyUrl: row.policyUri ? new URL(row.policyUri) : undefined,
    termsOfServiceUrl: row.tosUri ? new URL(row.tosUri) : undefined,
    clientSecret: row.oauthClient.clientSecret ?? undefined,
  });
}

function intoRow(tool: LtiTool): LtiToolRowWithoutDeployments {
  return {
    id: tool.id,
    claims: tool.claims.join(" "),
    customParameters: tool.customParameters ?? {},
    domain: tool.domain,
    grantTypes: tool.grantTypes.join(" "),
    initiateUri: tool.initiateUrl.toString(),
    responseTypes: tool.responseTypes.join(" "),
    targetLinkUri: tool.targetLinkUri.toString(),
    description: tool.description ?? null,
    homePageUri: tool.homePageUrl?.toString() ?? null,
    logoUri: tool.logoUrl?.toString() ?? null,
    policyUri: tool.policyUrl?.toString() ?? null,
    tosUri: tool.termsOfServiceUrl?.toString() ?? null,

    oauthClient: {
      id: tool.id,
      applicationType: tool.applicationType,
      jwksUri: tool.jwksUrl.toString(),
      name: tool.name,
      scopes: tool.scopes.join(" "),
      clientSecret: tool.clientSecret ?? null,
      redirectUris: tool.redirectUrls.map((uri) => ({
        uri,
        clientId: tool.id,
      })),
      contacts: tool.contacts?.map((email) => ({ clientId: tool.id, email })) ?? [],
    },

    supportedMessages: tool.messages.map((message) => ({
      clientId: tool.id,
      type: message.type,
      customParameters: message.customParameters ?? null,
      iconUri: message.iconUri ?? null,
      label: message.label ?? null,
      placements: message.placements?.join(" ") ?? null,
      targetLinkUri: message.targetLinkUri?.toString() ?? null,
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
