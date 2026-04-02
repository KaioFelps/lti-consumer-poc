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
import { LtiTool } from "@/modules/lti/tools/entities/lti-tool.entity";
import { LtiToolPreview } from "@/modules/lti/tools/entities/lti-tool-preview.entity";
import { ToolNotFoundError } from "@/modules/lti/tools/errors/tool-not-found.error";
import { LtiToolsRepository } from "@/modules/lti/tools/lti-tools.repository";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool as BaseLtiTool } from "$/core/tool";
import { DrizzleClient } from "../client";
import ltiToolPreviewsMapper from "../mappers/lti-tool-previews.mapper";
import ltiToolsMapper from "../mappers/lti-tools.mapper";

@Injectable()
export class DrizzleLtiToolsRepository extends LtiToolsRepository {
  @Inject()
  private readonly drizzle: DrizzleClient;

  public async findManyTools(): Promise<Either<IrrecoverableError, LtiTool[]>> {
    return await pipe(
      taskEither.tryCatch(
        () => this.drizzle.getClient().query.ltiTools.findMany(ltiToolsMapper.requiredQueryConfig),
        (error: Error) => {
          return new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsRepository.name} on finding many tools.`,
            error,
          );
        },
      ),
      taskEither.map((rows) => rows.map(ltiToolsMapper.fromRow)),
      taskEither.map((ltiRecords) => ltiRecords.map((record) => new LtiTool(record))),
    )();
  }

  public async findToolById(id: string): Promise<Either<LtiRepositoryError, BaseLtiTool>> {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiTools.findFirst({
            ...ltiToolsMapper.requiredQueryConfig,
            where: eq(ltiTools.id, id),
          }),
        (err: Error) => {
          return new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `An error occurred in ${DrizzleLtiToolsRepository.name} when finding LTI tool by id.`,
              err,
            ),
          });
        },
      ),
      taskEither.map((row) => {
        return pipe(
          option.fromNullable(row),
          option.map(ltiToolsMapper.fromRow),
          option.map((record) => new LtiTool(record)),
        );
      }),
      taskEither.chain(
        taskEither.fromOption(
          () =>
            new LtiRepositoryError({
              type: "NotFound",
              cause: new ToolNotFoundError(id),
              subject: BaseLtiTool.name,
            }),
        ),
      ),
      taskEither.map((tool) => tool.record),
    )();
  }

  public async upsertTool(tool: LtiTool): Promise<Either<IrrecoverableError, LtiTool>> {
    const {
      oauthClient: { contacts, redirectUris, ...oauthClient },
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

      await tx.delete(oauthRedirectUris).where(eq(oauthRedirectUris.clientId, record.id));

      if (redirectUris.length) {
        await tx.insert(oauthRedirectUris).values(redirectUris);
      }

      await tx.delete(oauthContacts).where(eq(oauthContacts.clientId, record.id));

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
            `An error occurred in ${DrizzleLtiToolsRepository.name} when trying to upsert an LTI tool.`,
            err,
          );
        },
      ),
      taskEither.map((_row) => tool),
    )();
  }

  public async deleteToolById(id: string): Promise<Either<IrrecoverableError, void>> {
    return await pipe(
      taskEither.tryCatch(
        () => this.drizzle.getClient().delete(oauthClients).where(eq(oauthClients.id, id)),
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
  ): Promise<Either<LtiRepositoryError, BaseLtiTool[]>> {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiTools.findMany({
            ...ltiToolsMapper.requiredQueryConfig,
            where: inArray(ltiTools.id, resourceLinksIds),
          }),
        (error: Error) => {
          return new LtiRepositoryError({
            type: "ExternalError",
            cause: new IrrecoverableError(
              `An error occurred in ${DrizzleLtiToolsRepository.name} when finding tools by resource links IDs.`,
              error,
            ),
          });
        },
      ),
      taskEither.map((rows) => rows.map(ltiToolsMapper.fromRow)),
    )();
  }

  public async findManyPreviews(): Promise<Either<IrrecoverableError, LtiToolPreview[]>> {
    return await pipe(
      taskEither.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .query.ltiTools.findMany(ltiToolPreviewsMapper.requiredQueryConfig),
        (error: Error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsRepository.name} when finding tools previews.`,
            error,
          ),
      ),
      taskEither.map((rows) => rows.map(ltiToolPreviewsMapper.fromRow)),
    )();
  }
}
