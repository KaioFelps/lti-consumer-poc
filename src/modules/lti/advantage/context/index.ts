import { either } from "fp-ts";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ContextConcreteType } from "../../ags/enums/context-concrete-type";

export function mountContextId(concreteEntityId: string, concreteType: ContextConcreteType) {
  return `${concreteType}:${concreteEntityId}`;
}

export function unmountContextId(composedId: string) {
  const partials = composedId.split(":");

  if (partials.length !== 2) {
    const error = new IrrecoverableError(
      "Found malformed context id. Expected format is <concreteType>:<concreteEntityId>, " +
        `but found id '${composedId}'.`,
    );

    return either.left(error);
  }

  const [type, id] = partials;

  const isKnownContextConcreteType = Object.values(ContextConcreteType).some(
    (knownType) => knownType === type,
  );

  if (!isKnownContextConcreteType) {
    const error = new IrrecoverableError(
      "Found unknown context type when decomposing context id. Expected types are: " +
        Object.values(ContextConcreteType).join(", ") +
        `, but found type '${type}'.`,
    );

    return either.left(error);
  }

  return either.right({
    concreteType: type as ContextConcreteType,
    concreteEntityId: id,
  });
}
