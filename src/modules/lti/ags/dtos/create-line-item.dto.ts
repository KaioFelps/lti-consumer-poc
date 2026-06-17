import { Expose, Transform } from "class-transformer";
import { JsonValue } from "common/src/types/json-value";
import { either } from "fp-ts";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

// properties defined by LTI AGS 2.0 specification
const officialSchema = z.object(
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
    resourceId: z.string("lti:ags:create-line-item:errors:resource-id-must-be-string").optional(),
    resourceLinkId: z
      .string("lti:ags:create-line-item:errors:resource-link-id-must-be-string")
      .optional(),
  },
  { error: "lti:ags:create-line-item:errors:body-should-be-object" },
);

// a trick to handle the extensions that the tool may send and group them in `customParameters` field
// see: https://www.imsglobal.org/spec/lti-ags/v2p0#extensions
const schema = officialSchema.catchall(z.any()).transform((data) => {
  const {
    label,
    scoreMaximum,
    endDateTime,
    resourceId,
    resourceLinkId,
    startDateTime,
    tag,
    // the @expose below will force it to get injected, but it's not what we expect...
    // hence we ignore it
    customParameters: _,
    // the rest are actually the custom parameters...
    ..._customParameters
  } = data;

  const customParameters =
    Object.keys(_customParameters).length > 0
      ? (_customParameters as Record<string, JsonValue>)
      : undefined;

  return {
    label,
    scoreMaximum,
    endDateTime,
    resourceId,
    resourceLinkId,
    startDateTime,
    tag,
    customParameters,
  };
});

export class CreateLineItemDTO implements DTO {
  @Expose() public readonly scoreMaximum!: number;
  @Expose() public readonly label!: string;
  @Expose() public readonly tag?: string;
  @Expose() public readonly startDateTime?: Date;
  @Expose() public readonly endDateTime?: Date;
  @Expose() public readonly resourceId?: string;
  @Expose() public readonly resourceLinkId?: string;

  @Expose()
  @Transform(({ obj }) => obj.customParameters)
  public readonly customParameters?: z.infer<typeof schema>["customParameters"];

  validate() {
    const { success, data, error: validationErrors } = schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(validationErrors));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
