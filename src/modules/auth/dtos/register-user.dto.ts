import { Expose } from "class-transformer";
import { ClassProperties } from "common/src/types/class-properties.js";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import z from "zod";
import { DTO } from "@/core/interfaces/dto.js";
import { ValidationErrors } from "@/core/validation/validation-errors.js";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error.js";
import { SystemRole } from "@/modules/identity/user/enums/system-role.js";

export class RegisterUserDTO implements DTO {
  protected static readonly registerUserSchema = z.object({
    username: z
      .string({ error: "auth:register-user:username-invalid-type" })
      .min(1, { error: "auth:register-user:username-invalid-type" }),
    password: z
      .string({ error: "auth:register-user:password-invalid-type" })
      .min(8, { error: "auth:register-user:password-too-short" })
      .max(70, { error: "auth:register-user:password-too-long" }),
    systemRole: z
      .enum([SystemRole.Admin, SystemRole.User], {
        error: "auth:user-register:system-role-invalid-type",
      })
      .optional(),
  });

  @Expose()
  public readonly username: string;

  @Expose()
  public readonly password: string;

  @Expose()
  public readonly systemRole: SystemRole;

  public constructor(props: ClassProperties<RegisterUserDTO>) {
    Object.assign(this, props);
  }

  validate(): Either<ValidationErrors, undefined> {
    const {
      success,
      data,
      error: validationErrors,
    } = RegisterUserDTO.registerUserSchema.safeParse(this);

    if (!success) {
      return either.left(mapZodErrorsToCoreValidationErrors(validationErrors));
    }

    Object.assign(this, data);
    return either.right(undefined);
  }
}
