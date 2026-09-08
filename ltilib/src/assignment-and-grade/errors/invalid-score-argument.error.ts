import { InvalidArgumentError } from "$/core/errors/bases/invalid-argument.error";

export class InvalidScoreArgumentError<
  Field extends InvalidScoreArgumentError.Fields = InvalidScoreArgumentError.Fields,
> extends InvalidArgumentError<Field, InvalidScoreArgumentError.Codes[Field][number]> {}

export namespace InvalidScoreArgumentError {
  export type Fields =
    | "timestamp"
    | "scoreGiven"
    | "scoreMaximum"
    | "customParameters"
    | "resourceLinkId"
    | "submission.startedAt"
    | "submission.submittedAt";

  export type Codes = typeof codes;

  const codes = {
    timestamp: [
      "missing_sub_second_precision",
      "missing_timezone_designator",
      "invalid_datetime",
      "outdated",
    ],
    scoreGiven: ["must_be_greater_than_zero"],
    scoreMaximum: ["must_be_greater_than_zero", "required"],
    customParameters: ["key_must_be_fully_qualified_url"],
    resourceLinkId: ["must_belong_to_tool", "must_belong_to_score_context"],
    "submission.startedAt": [
      "missing_sub_second_precision",
      "missing_timezone_designator",
      "invalid_datetime",
    ],
    "submission.submittedAt": [
      "missing_sub_second_precision",
      "missing_timezone_designator",
      "invalid_datetime",
      "must_be_after_started_at",
    ],
  } as const satisfies Record<Fields, string[]>;
}
