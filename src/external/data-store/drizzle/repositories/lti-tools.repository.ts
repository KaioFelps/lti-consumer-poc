import { Inject, Injectable } from "@nestjs/common";
import {
  ltiToolSupportedMessageRoles,
  ltiToolSupportedMessages,
  ltiTools,
  oauthClient,
  oauthContacts,
  oauthRedirectUris,
} from "drizzle/schema";
import { eq } from "drizzle-orm";
import { option, taskEither } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { LtiTool } from "@/lti/lti-tool";
import { LTIToolsRepository } from "@/lti/lti-tools.repository";
import { AnyLtiRole } from "$/claims";
import { MessageType } from "$/claims/serialization";
import { Contact, GrantType } from "$/registration/dynamic/tool-configuration";
import { MessagePlacement } from "$/registration/enums/message-placement";
import { ToolRecord } from "$/registration/tool-record";
import { ToolSupportedMessage } from "$/registration/tool-supported-message";
import { DrizzleClient } from "../client";

@Injectable()
export class DrizzleLtiToolsRepository extends LTIToolsRepository {
  @Inject()
  private readonly drizzle: DrizzleClient;

  public async findManyTools(): Promise<Either<IrrecoverableError, LtiTool[]>> {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiTools.findMany({
            with: {
              deployments: true,
              oauthClient: {
                with: {
                  contacts: true,
                  redirectUris: true,
                },
              },
              supportedMessages: {
                with: {
                  roles: true,
                },
              },
            },
          }),
        (error: Error) => {
          return new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsRepository.name} on ` +
              "finding many tools.",
            error,
          );
        },
      ),
      taskEither.map((rows) => {
        return rows.map((row) => {
          const ltiRecord = ToolRecord.createUnchecked({
            applicationType: row.oauthClient.applicationType as "web",
            contacts: row.oauthClient.contacts.map(
              (contact) => contact.email as Contact,
            ),
            grantTypes: row.grantTypes.split(" ") as GrantType[],
            id: row.id,
            ltiConfiguration: {
              claims: row.claims.split(" "),
              deploymentsIds: row.deployments.map(
                (deployment) => deployment.id,
              ),
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
                        .map((placement) => placement as MessagePlacement) ??
                      undefined,
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

          return ltiRecord;
        });
      }),
      taskEither.map((ltiRecords) =>
        ltiRecords.map((record) => new LtiTool(record)),
      ),
    )();
  }

  public async findToolById(
    id: string,
  ): Promise<Either<IrrecoverableError | ResourceNotFoundError, LtiTool>> {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiTools.findFirst({
            where: eq(ltiTools.id, id),
            with: {
              deployments: true,
              oauthClient: {
                with: {
                  contacts: true,
                  redirectUris: true,
                },
              },
              supportedMessages: {
                with: {
                  roles: true,
                },
              },
            },
          }),
        (err: Error) => {
          return new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsRepository.name} when finding LTI tool by id.`,
            err,
          );
        },
      ),
      taskEither.map((row) => {
        return pipe(
          option.fromNullable(row),
          option.map((row) =>
            ToolRecord.createUnchecked({
              applicationType: row.oauthClient.applicationType as "web",
              contacts: row.oauthClient.contacts.map(
                (contact) => contact.email as Contact,
              ),
              grantTypes: row.grantTypes.split(" ") as GrantType[],
              id: row.id,
              ltiConfiguration: {
                claims: row.claims.split(" "),
                deploymentsIds: row.deployments.map(
                  (deployment) => deployment.id,
                ),
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
                          .map((placement) => placement as MessagePlacement) ??
                        undefined,
                      roles:
                        message.roles?.length === 0
                          ? undefined
                          : message.roles.map(
                              (role) => role.role as AnyLtiRole,
                            ),
                      targetLinkUri: message.targetLinkUri ?? undefined,
                    }) satisfies ToolSupportedMessage,
                ),
                targetLinkUri: row.targetLinkUri,
                customParameters: row.customParameters as Record<
                  string,
                  string
                >,
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
            }),
          ),
          option.map((record) => new LtiTool(record)),
        );
      }),
      taskEither.map(
        taskEither.fromOption(
          () =>
            new ResourceNotFoundError({
              errorMessageIdentifier: `Could not find LTI tools registered with id ${id}.`,
              messageParams: {},
            }),
        ),
      ),
      taskEither.flattenW,
    )();
  }

  public async upsertTool(
    tool: LtiTool,
  ): Promise<Either<IrrecoverableError, LtiTool>> {
    const record = tool.record;
    const ltiToolMappedData = {
      claims: record.ltiConfiguration.claims.join(" "),
      customParameters: record.ltiConfiguration.customParameters,
      domain: record.ltiConfiguration.domain,
      grantTypes: record.grantTypes.join(" "),
      id: record.id,
      initiateUri: record.uris.initiate,
      responseTypes: record.responseTypes.join(" "),
      targetLinkUri: record.ltiConfiguration.targetLinkUri,
      description: record.ltiConfiguration.description,
      homePageUri: record.uris.homePage,
      logoUri: record.uris.logo,
      policyUri: record.uris.policy,
      tosUri: record.uris.tos,
    };

    const oauthClientMappedData = {
      id: record.id,
      applicationType: record.applicationType,
      jwksUri: record.uris.jwks,
      name: record.name,
      scopes: record.scope,
      clientSecret: record.clientSecret,
    };

    const transaction = this.drizzle.getClient().transaction(async (tx) => {
      await tx
        .insert(oauthClient)
        .values(oauthClientMappedData)
        .onConflictDoUpdate({
          target: oauthClient.id,
          set: oauthClientMappedData,
        });

      // an option for small sets is to simply delete everything and insert just the fresh data
      await tx
        .delete(oauthRedirectUris)
        .where(eq(oauthRedirectUris.clientId, record.id));

      if (record.uris.redirect.length) {
        await tx
          .insert(oauthRedirectUris)
          .values(
            record.uris.redirect.map((uri) => ({ uri, clientId: record.id })),
          );
      }

      await tx
        .delete(oauthContacts)
        .where(eq(oauthContacts.clientId, record.id));

      if (record.contacts?.length) {
        await tx
          .insert(oauthContacts)
          .values(
            record.contacts.map((email) => ({ clientId: record.id, email })),
          );
      }

      await tx
        .insert(ltiTools)
        .values(ltiToolMappedData)
        .onConflictDoUpdate({
          target: ltiTools.id,
          set: {
            ...ltiToolMappedData,
            id: undefined,
          },
        });

      await tx
        .delete(ltiToolSupportedMessages)
        .where(eq(ltiToolSupportedMessages.clientId, record.id));

      if (record.ltiConfiguration.messages.length) {
        await tx.insert(ltiToolSupportedMessages).values(
          record.ltiConfiguration.messages.map((message) => ({
            clientId: record.id,
            type: message.type,
            customParameters: message.customParameters,
            iconUri: message.iconUri,
            label: message.label,
            placements: message.placements?.join(" "),
            targetLinkUri: message.targetLinkUri,
          })),
        );

        const messagesWithRole = record.ltiConfiguration.messages.filter(
          (message) => message.roles?.length,
        );

        if (messagesWithRole.length) {
          await tx.insert(ltiToolSupportedMessageRoles).values(
            messagesWithRole.map((message) => ({
              clientId: record.id,
              messageType: message.type,
              role: message.roles!.join(" "),
            })),
          );
        }
      }
    });

    return await pipe(
      taskEither.tryCatch(
        () => transaction,
        (err: Error) => {
          return new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsRepository.name} when trying to upsert a LTI tool.`,
            err,
          );
        },
      ),
      taskEither.map((_row) => tool),
    )();
  }

  public async deleteToolById(
    id: string,
  ): Promise<Either<IrrecoverableError, void>> {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .delete(oauthClient)
            .where(eq(oauthClient.id, id)),
        (err: Error) => {
          return new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsRepository.name} when deleting the LTI Tool with ID ${id}.`,
            err,
          );
        },
      ),
      taskEither.map((_result) => {}),
    )();
  }
}
