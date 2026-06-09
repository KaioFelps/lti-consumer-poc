import { either } from "fp-ts";
import { ContextConcreteType } from "../../ags/enums/context-concrete-type";
import { InvalidComposedContextIdError } from "../errors/invalid-composed-context-id.error";

export function mountContextId(concreteEntityId: string, concreteType: ContextConcreteType) {
  return `${concreteType}:${concreteEntityId}`;
}

export function unmountContextId(composedId: string) {
  const partials = composedId.split(":");

  if (partials.length !== 2) {
    return either.left(new InvalidComposedContextIdError("malformed"));
  }

  const [type, id] = partials;

  const isKnownContextConcreteType = Object.values(ContextConcreteType).some(
    (knownType) => knownType === type,
  );

  if (!isKnownContextConcreteType) {
    return either.left(new InvalidComposedContextIdError("unknown"));
  }

  return either.right({
    concreteType: type as ContextConcreteType,
    concreteEntityId: id,
  });
}
