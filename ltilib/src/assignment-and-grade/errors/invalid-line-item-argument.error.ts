import { InvalidArgumentError } from "$/core/errors/invalid-argument.error";

type Fields = "label" | "scoreMaximum";

const codes = {
  label: ["required"],
  scoreMaximum: ["must_be_greater_than_zero"],
} as const satisfies Record<Fields, string[]>;

type Codes = typeof codes;

export class InvalidLineItemArgumentError<
  Field extends Fields = Fields,
> extends InvalidArgumentError<Field, Codes[Field][number]> {}
