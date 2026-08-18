import { Expose, Transform } from "class-transformer";
import { JsonValue } from "common/src/types/json-value";
import { either } from "fp-ts";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ConfigCoreValidation } from "@/lib/core-validation";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

const schema = z.object(
  {
    scoreMaximum: z
      .number("lti:ags:create-line-item:errors:score-maximum-must-be-number")
      .positive("lti:ags:create-line-item:errors:score-maximum-must-be-positive"),
    label: z.string("lti:ags:create-line-item:errors:label-is-required").nonempty(),
    tag: z.string("lti:ags:create-line-item:errors:tag-must-be-string").optional(),
    startDateTime: z.coerce
      .date("lti:ags:create-line-item:errors:start-date-time-must-be-date")
      .optional(),
    endDateTime: z.coerce
      .date("lti:ags:create-line-item:errors:end-date-time-must-be-date")
      .optional(),
    resourceId: z.coerce
      .string("lti:ags:create-line-item:errors:resource-id-must-be-string")
      .optional(),
    resourceLinkId: z
      .string("lti:ags:create-line-item:errors:resource-link-id-must-be-string")
      .optional(),
    customParameters: z.record(z.string(), z.any()).optional(),
  },
  { error: "lti:ags:create-line-item:errors:body-should-be-object" },
);

const KNOWN_KEYS = new Set(Object.keys(schema.shape));

@ConfigCoreValidation({ shallUnflatten: false })
export class CreateLineItemDTO implements DTO {
  @Expose() public readonly scoreMaximum!: number;
  @Expose() public readonly label!: string;
  @Expose() public readonly tag?: string;
  @Expose() public readonly startDateTime?: Date;
  @Expose() public readonly endDateTime?: Date;
  @Expose() public readonly resourceId?: string;
  @Expose() public readonly resourceLinkId?: string;

  @Expose()
  @Transform(({ obj }) => {
    const source = (obj ?? {}) as Record<string, JsonValue>;
    const { customParameters: nested, ...rest } = source;

    const extraTopLevel: Record<string, JsonValue> = {};

    for (const [key, val] of Object.entries(rest)) {
      if (!KNOWN_KEYS.has(key)) extraTopLevel[key] = val;
    }

    const merged = {
      ...extraTopLevel,
      ...(typeof nested === "object" && nested !== null ? nested : {}),
    };

    return Object.keys(merged).length > 0 ? merged : undefined;
  })
  public readonly customParameters?: Record<string, JsonValue>;

  validate() {
    const { success, data, error: validationErrors } = schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(validationErrors));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
