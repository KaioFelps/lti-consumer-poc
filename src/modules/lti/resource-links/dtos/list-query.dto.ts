import { Expose } from "class-transformer";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

export class ListResourceLinksQueryDto implements DTO {
  protected static deployListQuerySchema = z.object({
    deploymentId: z.string({
      error: "lti:list-resource-links:deployment-id-required",
    }),
  });

  @Expose()
  deploymentId: string;

  validate(): Either<ValidationErrors, void> {
    const { success, data, error } =
      ListResourceLinksQueryDto.deployListQuerySchema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
