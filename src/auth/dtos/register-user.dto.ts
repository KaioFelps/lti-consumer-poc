import { Expose } from "class-transformer";
import { ClassProperties } from "common/src/types/class-properties";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { SystemRole } from "@/identity/user/enums/system-role";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

export class RegisterUserDTO implements DTO {
  protected static readonly registerUserSchema = z.object({
    username: z.string({ error: "auth:register-user:username-invalid-type" }),
    password: z
      .string({ error: "auth:register-user:password-invalid-type" })
      .min(8, { error: "auth:register-user:password-too-short" }),
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
    const { success, error: validationErrors } =
      RegisterUserDTO.registerUserSchema.safeParse(this);

    if (success) return either.right(undefined);

    return either.left(mapZodErrorsToCoreValidationErrors(validationErrors));
  }
}
