import { Inject, Injectable } from "@nestjs/common";
import {
  ltiToolSupportedMessageRoles,
  ltiToolSupportedMessages,
  ltiTools,
  oauthClients,
  oauthContacts,
  oauthRedirectUris,
} from "drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { option, taskEither } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { LtiTool } from "@/lti/tools/entities/lti-tool.entity";
import { LtiToolPreview } from "@/lti/tools/entities/lti-tool-preview.entity";
import { LtiToolsRepository } from "@/lti/tools/lti-tools.repository";
import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { LtiResourceLink } from "$/core/resource-link";
import { Contact, GrantType } from "$/registration/dynamic/tool-configuration";
import { MessagePlacement } from "$/registration/enums/message-placement";
import { ToolRecord } from "$/registration/tool-record";
import { ToolSupportedMessage } from "$/registration/tool-supported-message";
import { DrizzleClient } from "../client";
import ltiToolsMapper from "../mappers/lti-tools.mapper";

@Injectable()
export class DrizzleLtiToolsRepository extends LtiToolsRepository {
  @Inject()
  private readonly drizzle: DrizzleClient;

  public async findManyTools(): Promise<Either<IrrecoverableError, LtiTool[]>> {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .query.ltiTools.findMany(ltiToolsMapper.requiredQueryConfig),
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
            ...ltiToolsMapper.requiredQueryConfig,
            where: eq(ltiTools.id, id),
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
          option.map(ltiToolsMapper.fromRow),
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
    const {
      oauthClient: { contacts, redirectUris, ...oauthClient },
      deployments: _,
      supportedMessages,
      ...record
    } = ltiToolsMapper.intoRow(tool.record);

    const transaction = this.drizzle.getClient().transaction(async (tx) => {
      await tx.insert(oauthClients).values(oauthClient).onConflictDoUpdate({
        target: oauthClients.id,
        set: oauthClient,
      });

      /**
       * an option for small sets is to simply delete everything and insert just the fresh data
       */

      await tx
        .delete(oauthRedirectUris)
        .where(eq(oauthRedirectUris.clientId, record.id));

      if (redirectUris.length) {
        await tx.insert(oauthRedirectUris).values(redirectUris);
      }

      await tx
        .delete(oauthContacts)
        .where(eq(oauthContacts.clientId, record.id));

      if (contacts.length) await tx.insert(oauthContacts).values(contacts);

      await tx
        .insert(ltiTools)
        .values(record)
        .onConflictDoUpdate({
          target: ltiTools.id,
          set: { ...record, id: undefined },
        });

      await tx
        .delete(ltiToolSupportedMessages)
        .where(eq(ltiToolSupportedMessages.clientId, record.id));

      if (supportedMessages.length) {
        type Message = (typeof supportedMessages)[number];

        const [_roles, messages] = supportedMessages.reduce(
          (acc, supportedMessage) => {
            const { roles, ...message } = supportedMessage;

            acc[0].push(roles);
            acc[1].push(message);

            return acc;
          },
          [[] as Message["roles"][], [] as Omit<Message, "roles">[]] as const,
        );

        const roles = _roles.flat();

        await tx.insert(ltiToolSupportedMessages).values(messages);

        if (roles.length) {
          await tx.insert(ltiToolSupportedMessageRoles).values(roles);
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
            .delete(oauthClients)
            .where(eq(oauthClients.id, id)),
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

  public async findToolsOwningResourceLinks(
    resourceLinksIds: LtiResourceLink["id"][],
  ): Promise<Either<IrrecoverableError, ToolRecord[]>> {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiTools.findMany({
            ...ltiToolsMapper.requiredQueryConfig,
            where: inArray(ltiTools.id, resourceLinksIds),
          }),
        (error: Error) => {
          return new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsRepository.name} when finding tools by resource links IDs.`,
            error,
          );
        },
      ),
      taskEither.map((rows) => rows.map(ltiToolsMapper.fromRow)),
    )();
  }
}
