import { InvalidArgumentError } from "$/core/errors/bases/invalid-argument.error";

export class InvalidLineItemArgumentError<
  Field extends InvalidLineItemArgumentError.Fields = InvalidLineItemArgumentError.Fields,
> extends InvalidArgumentError<Field, InvalidLineItemArgumentError.Codes[Field][number]> {}

export namespace InvalidLineItemArgumentError {
  export type Fields =
    | "label"
    | "scoreMaximum"
    | "customParameters"
    | "resourceLinkId"
    | "resourceId";

  export type Codes = typeof codes;

  const codes = {
    label: ["required"],
    scoreMaximum: ["must_be_greater_than_zero", "required"],
    customParameters: ["key_must_be_fully_qualified_url"],
    resourceLinkId: ["must_belong_to_tool", "must_belong_to_lineitem_context"],
    resourceId: ["must_belong_to_tool", "must_belong_to_lineitem_context"],
  } as const satisfies Record<Fields, string[]>;
}
