import { Expose } from "class-transformer";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

const schema = z.object({
  width: z.coerce
    .number({ error: "lti:initiate-launch:width-must-be-number" })
    .optional()
    .default(1000),
  height: z.coerce
    .number({ error: "lti:initiate-launch:height-must-be-number" })
    .optional()
    .default(700),
});

export class InitiateLaunchDto implements DTO {
  @Expose()
  width: number;

  @Expose()
  height: number;

  validate(): Either<ValidationErrors, void> {
    const { success, data, error } = schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
