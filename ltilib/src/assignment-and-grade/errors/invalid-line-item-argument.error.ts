import { InvalidArgumentError } from "$/core/errors/bases/invalid-argument.error";

export class InvalidLineItemArgumentError<
  Field extends InvalidLineItemArgumentError.Fields = InvalidLineItemArgumentError.Fields,
> extends InvalidArgumentError<Field, InvalidLineItemArgumentError.Codes[Field][number]> {}

export namespace InvalidLineItemArgumentError {
  // do not need to handle resource id:
  // - LTI does not state that it must or should belong to the same context to the line item,
  //   since it's something internal to the tool;
  // - it **will always** belong to the tool making the request because the service and repository
  //   searches for the tuple (resourceId, toolId), hence if it does not belong to the tool it
  //   won't even be found...
  export type Fields = "label" | "scoreMaximum" | "customParameters" | "resourceLinkId";

  export type Codes = typeof codes;

  const codes = {
    label: ["required"],
    scoreMaximum: ["must_be_greater_than_zero", "required"],
    customParameters: ["key_must_be_fully_qualified_url"],
    resourceLinkId: ["must_belong_to_tool", "must_belong_to_lineitem_context"],
  } as const satisfies Record<Fields, string[]>;
}
