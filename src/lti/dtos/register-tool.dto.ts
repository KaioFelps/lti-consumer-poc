import { Expose } from "class-transformer";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

export class RegisterToolDTO implements DTO {
  protected static registerToolSchema = z.object({
    registrationEndpoint: z.url({
      error: "lti:register-tool:registration-endpoint-invalid-type",
    }),
    useDockerInternalHost: z.coerce
      .boolean({
        error: "lti:register-tool:use-docker-internal-host-invalid-type",
      })
      .optional()
      .default(false),
  });

  @Expose()
  public readonly registrationEndpoint: string;

  @Expose()
  public readonly useDockerInternalHost: boolean;

  validate(): Either<ValidationErrors, void> {
    const { success, error, data } =
      RegisterToolDTO.registerToolSchema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
