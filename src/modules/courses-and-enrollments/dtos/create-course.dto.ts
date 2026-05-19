import { Expose } from "class-transformer";
import { ClassProperties } from "common/src/types/class-properties";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

export class CreateCourseDTO implements DTO {
  protected static readonly schema = z.object({
    title: z
      .string({ error: "courses:create:errors:title-must-be-text" })
      .max(400, { error: "courses:create:errors:title-too-big" })
      .min(1, { error: "courses:create:errors:title-too-small" }),
  });

  @Expose()
  public readonly title!: string;

  public constructor(props: ClassProperties<CreateCourseDTO>) {
    Object.assign(this, props);
  }

  validate(): Either<ValidationErrors, undefined> {
    const { success, data, error: validationErrors } = CreateCourseDTO.schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(validationErrors));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
