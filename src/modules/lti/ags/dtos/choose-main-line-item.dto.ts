import { Expose } from "class-transformer";
import type { UUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

const schema = z.object({
  lineItemId: z
    .string("lti:ags:create-assignment:errors:invalid-tool-id")
    .nonempty("lti:ags:create-assignment:errors:invalid-tool-id")
    .transform((v) => v as UUID),
});

type Schema = z.infer<typeof schema>;

export class ChooseMainLineItemDto implements DTO, Schema {
  @Expose()
  public readonly lineItemId!: UUID;

  validate(): Either<ValidationErrors, void> {
    const { success, data, error: validationErrors } = schema.safeParse(this);

    if (!success) {
      return e.left(mapZodErrorsToCoreValidationErrors(validationErrors));
    }

    Object.assign(this, data);
    return e.right(undefined);
  }
}
