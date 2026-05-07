import { Expose, Transform, Type } from "class-transformer";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

const schema = z.object({
  toolId: z
    .string("lti:ags:create-assignment:errors:invalid-tool-id")
    .nonempty("lti:ags:create-assignment:errors:invalid-tool-id")
    .optional(),
  assignment: z.object(
    {
      title: z
        .string("assignments:create-assignment:title-must-be-string")
        .min(1, "assignments:create-assignment:title-must-not-be-empty")
        .max(400, "assignments:create-assignment:title-too-long"),
      maxScore: z.coerce
        .number("assignments:create-assignment:max-score-must-be-number")
        .min(1, "assignments:create-assignment:max-score-too-short")
        .max(0x7fff, "assignments:create-assignment:max-score-too-long"),
      releasedAt: z.preprocess(
        (arg) => (arg === "" ? undefined : arg),
        z.coerce.date("assignments:create-assignment:release-date-must-be-date").optional(),
      ),
      deadline: z.preprocess(
        (arg) => (arg === "" ? undefined : arg),
        z.coerce.date("assignments:create-assignment:deadline-must-be-date").optional(),
      ),
    },
    "lti:ags:create-assignments:assignment-property-should-be-object",
  ),
  resourceLink: z.object(
    {
      resourceUrl: z.url("lti:create-resource-link:resource-link-is-valid-url"),
      customParameters: z
        .record(
          z.string("lti:create-resource-link:custom-parameters-key-must-be-string"),
          z.string("lti:create-resource-link:custom-parameters-value-must-be-string"),
          "lti:create-resource-link:custom-parameters-must-be-a-key-value-map",
        )
        .optional(),
    },
    "lti:ags:create-assignments:resource-link-property-should-be-object",
  ),
});

type Schema = z.infer<typeof schema>;
type IResourceLinkDto = Schema["resourceLink"];
type IAssignment = Schema["assignment"];

class ResourceLinkDto implements IResourceLinkDto {
  @Expose()
  @Transform(({ obj }) => obj.customParameters)
  public readonly customParameters?: IResourceLinkDto["customParameters"];

  @Expose() public readonly resourceUrl!: string;
}

class Assignment implements IAssignment {
  @Expose() public readonly title!: string;
  @Expose() public readonly maxScore!: number;
  @Expose() public readonly releasedAt?: Date;
  @Expose() public readonly deadline?: Date;
}

export class CreateExternalLtiAssignmentDto implements DTO, Schema {
  @Expose() public readonly toolId!: string;

  @Expose()
  @Type(() => Assignment)
  public readonly assignment!: Assignment;

  @Expose()
  @Type(() => ResourceLinkDto)
  public readonly resourceLink!: ResourceLinkDto;

  validate(): Either<ValidationErrors, void> {
    const { success, data, error: validationErrors } = schema.safeParse(this);

    if (!success) {
      return e.left(mapZodErrorsToCoreValidationErrors(validationErrors));
    }

    Object.assign(this, data);
    return e.right(undefined);
  }
}
