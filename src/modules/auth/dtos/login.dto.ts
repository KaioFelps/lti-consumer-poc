import { Expose } from "class-transformer";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import z from "zod";
import { DTO } from "@/core/interfaces/dto.js";
import { ValidationErrors } from "@/core/validation/validation-errors.js";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error.js";

export class LoginDTO implements DTO {
  protected static loginSchema = z.object({
    username: z
      .string({
        error: "auth:authenticate-user:username-invalid-type",
      })
      .min(1, {
        error: "auth:authenticate-user:username-invalid-type",
      }),
    password: z
      .string({
        error: "auth:authenticate-user:password-invalid-type",
      })
      .min(1, { error: "auth:authenticate-user:password-invalid-type" }),
    destiny: z.string().optional(),
  });

  @Expose()
  public readonly username: string;

  @Expose()
  public readonly password: string;

  @Expose()
  public readonly destiny: string;

  validate(): Either<ValidationErrors, void> {
    const { success, error } = LoginDTO.loginSchema.safeParse(this);
    if (success) return either.right(undefined);
    return either.left(mapZodErrorsToCoreValidationErrors(error));
  }
}
