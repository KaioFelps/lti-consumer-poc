import { Injectable } from "@nestjs/common";
import { concreteContextTypeEnum, ltiContexts } from "drizzle/schema";
import { InferEnum } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import {
  CreateParams,
  LtiContextsRepository,
} from "@/modules/lti/advantage/repositories/lti-contexts.repository";
import { DrizzleClient } from "../client";
import { DrizzleTransactionManager } from "../transaction-manager";

@Injectable()
export class DrizzleLtiContextsRepository extends LtiContextsRepository {
  public constructor(
    private readonly drizzle: DrizzleClient,
    private readonly txManager: DrizzleTransactionManager,
  ) {
    super();
  }

  public create({
    concreteId,
    concreteType,
    parent,
  }: CreateParams): Promise<Either<IrrecoverableError, void>> {
    const client = this.txManager.getTx() ?? this.drizzle.getClient();
    return pipe(
      te.tryCatch(
        () =>
          client.insert(ltiContexts).values({
            concreteContextId: concreteId,
            concreteContextType: concreteType as InferEnum<typeof concreteContextTypeEnum>,
            parentContextId: parent?.concreteId,
            parentContextType: parent?.concreteType,
          }),
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiContextsRepository.name} when saving context.`,
            error as Error,
          ),
      ),
      te.map(() => {}),
    )();
  }
}
