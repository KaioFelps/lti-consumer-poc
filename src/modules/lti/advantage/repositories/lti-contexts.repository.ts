import type { Either } from "fp-ts/lib/Either";
import type { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ContextConcreteType } from "../../ags/enums/context-concrete-type";

export type CreateParams = {
  concreteId: string;
  concreteType: ContextConcreteType;
  parent?: CreateParams;
};

export abstract class LtiContextsRepository {
  public abstract create(params: CreateParams): Promise<Either<IrrecoverableError, void>>;
}
