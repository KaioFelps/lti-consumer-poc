import { Expose } from "class-transformer";
import { ClassProperties } from "common/src/types/class-properties";
import { either, option } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { PersonGender } from "@/identity/person/enums/gender";
import { CPF } from "@/identity/person/value-objects/cpf";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";
import { RegisterUserDTO } from "./register-user.dto";

export class RegisterPersonDTO extends RegisterUserDTO implements DTO {
  protected static registerPersonSchema = z.object({
    cpf: z
      .string({ error: "auth:register-person:cpf-invalid-type" })
      .refine((cpf) => option.isNone(CPF.validateCPFString(cpf)), {
        error: "auth:register-person:cpf-invalid-cpf",
      }),
    birthDate: z.coerce.date({
      error: "auth:register-person:date-invalid-type",
    }),
    firstName: z
      .string({
        error: "auth:register-person:first-name-invalid-type",
      })
      .min(1, {
        error: "auth:register-person:first-name-invalid-type",
      }),

    surname: z
      .string({ error: "auth:register-person:surname-invalid-type" })
      .min(1, {
        error: "auth:register-person:first-name-invalid-type",
      }),
    email: z.email({ error: "auth:register-person:email-invalid-type" }),
    gender: z
      .enum([PersonGender.Female, PersonGender.Male, PersonGender.NonBinary], {
        error: "auth:register-person:gender-invalid-type",
      })
      .optional(),
  });

  @Expose()
  public readonly cpf: string;

  @Expose()
  public readonly birthDate: Date;

  @Expose()
  public readonly firstName: string;

  @Expose()
  public readonly surname: string;

  @Expose()
  public readonly email: string;

  @Expose()
  public readonly gender?: string;

  public constructor(props: ClassProperties<RegisterPersonDTO>) {
    super(props);
    Object.assign(this, props);
  }

  public validate(): Either<ValidationErrors, undefined> {
    const userValidation = super.validate();

    const {
      success,
      error: errors,
      data,
    } = RegisterPersonDTO.registerPersonSchema.safeParse(this);

    if (success && either.isRight(userValidation)) {
      Object.assign(this, data);
      return either.right(undefined);
    }

    const validationErrors = new ValidationErrors();

    if (either.isLeft(userValidation))
      validationErrors.merge(userValidation.left);

    if (errors)
      validationErrors.merge(mapZodErrorsToCoreValidationErrors(errors));

    return either.left(validationErrors);
  }
}
