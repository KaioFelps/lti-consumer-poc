import { Expose } from "class-transformer";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import z from "zod";
import { DTO } from "@/core/interfaces/dto.js";
import { ValidationErrors } from "@/core/validation/validation-errors.js";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error.js";

const schema = z.object({
  assignmentId: z.uuid("assignments:details:errors:invalid-assignment-id"),
});

type Schema = z.infer<typeof schema>;

export class ShowAssignmentsDetailsDto implements DTO, Schema {
  @Expose() public readonly assignmentId!: string;

  validate(): Either<ValidationErrors, void> {
    const { success, data, error: validationErrors } = schema.safeParse({ ...this });

    if (!success) return e.left(mapZodErrorsToCoreValidationErrors(validationErrors));

    Object.assign(this, data);
    return e.right(undefined);
  }
}
