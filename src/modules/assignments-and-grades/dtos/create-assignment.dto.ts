import { Expose } from "class-transformer";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

export class CreateAssignmentDTO implements DTO {
  protected static createAssignmentSchema = z.object({
    title: z
      .string({ error: "assignments:create-assignment:title-must-be-string" })
      .nonempty({ error: "assignments:create-assignment:title-must-not-be-empty" })
      .max(400, { error: "assignments:create-assignment:title-too-long" }),
    maxScore: z.coerce
      .number({ error: "assignments:create-assignment:max-score-must-be-number" })
      .min(1, { error: "assignments:create-assignment:max-score-too-short" })
      .max(0x7fff, { error: "assignments:create-assignment:max-score-too-long" }),
    releasedAt: z.preprocess(
      (arg) => (arg === "" ? undefined : arg),
      z.coerce
        .date({ error: "assignments:create-assignment:release-date-must-be-date" })
        .optional(),
    ),
    deadline: z.preprocess(
      (arg) => (arg === "" ? undefined : arg),
      z.coerce.date({ error: "assignments:create-assignment:deadline-must-be-date" }).optional(),
    ),
  });

  @Expose() public title!: string;
  @Expose() public maxScore!: number;
  @Expose() public releasedAt?: Date;
  @Expose() public deadline?: Date;

  validate(): Either<ValidationErrors, void> {
    const { success, error, data } = CreateAssignmentDTO.createAssignmentSchema.safeParse(this);

    if (!success) return e.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return e.right(undefined);
  }
}
