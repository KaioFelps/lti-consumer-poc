import { Expose } from "class-transformer";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import z from "zod";
import { DTO } from "@/core/interfaces/dto.js";
import { ValidationErrors } from "@/core/validation/validation-errors.js";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error.js";

export class RegisterToolDTO implements DTO {
  protected static registerToolSchema = z.object({
    registrationEndpoint: z.url({
      error: "lti:register-tool:registration-endpoint-invalid-type",
    }),
  });

  @Expose()
  public readonly registrationEndpoint: string;

  validate(): Either<ValidationErrors, void> {
    const { success, error, data } = RegisterToolDTO.registerToolSchema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
