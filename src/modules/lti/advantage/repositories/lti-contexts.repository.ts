import type { Either } from "fp-ts/lib/Either";
import type { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiContextsRepository as LtilibContextsRepository } from "$/core/repositories/contexts.repository";
import { ContextConcreteType } from "../../ags/enums/context-concrete-type";
import { ContextNotFoundError } from "../errors/context-not-found.error";
import { InvalidComposedContextIdError } from "../errors/invalid-composed-context-id.error";

export type CreateParams = {
  concreteId: string;
  concreteType: ContextConcreteType;
  parent?: CreateParams;
};

export abstract class LtiContextsRepository extends LtilibContextsRepository<ContextConcreteType> {
  public abstract create(params: CreateParams): Promise<Either<IrrecoverableError, void>>;

  public abstract findById(
    contextId: string,
  ): Promise<
    Either<
      LtiRepositoryError<ContextNotFoundError | InvalidComposedContextIdError | IrrecoverableError>,
      Context<ContextConcreteType>
    >
  >;
}
