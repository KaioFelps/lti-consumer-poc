import type { Either } from "fp-ts/lib/Either.js";
import type { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { Context } from "$/core/context.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiContextsRepository as LtilibContextsRepository } from "$/core/repositories/contexts.repository.js";
import { ContextConcreteType } from "../../ags/enums/context-concrete-type.js";
import { ContextNotFoundError } from "../errors/context-not-found.error.js";
import { InvalidComposedContextIdError } from "../errors/invalid-composed-context-id.error.js";

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
