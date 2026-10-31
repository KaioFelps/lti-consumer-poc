import { Expose, Transform } from "class-transformer";
import type { UUID } from "common/src/types/uuid.js";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import z from "zod";
import { DTO } from "@/core/interfaces/dto.js";
import { ValidationErrors } from "@/core/validation/validation-errors.js";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error.js";

export class CreateResourceLinkDto implements DTO {
  protected static createResourceLinkSchema = z.object({
    deploymentId: z.uuid({
      error: "lti:create-resource-link:deployment-id-is-required-and-valid",
    }),
    resourceLink: z
      .url({
        error: "lti:create-resource-link:resource-link-is-valid-url",
      })
      .optional(),
    title: z
      .string({ error: "lti:create-resource-link:title-must-be-string" })
      .nonempty({ error: "lti:create-resource-link:title-must-not-be-empty" })
      .optional(),
    description: z
      .string({ error: "lti:create-resource-link:description-must-be-string" })
      .nonempty({
        error: "lti:create-resource-link:description-must-not-be-empty",
      })
      .optional(),
    customParameters: z
      .record(
        z.string({
          error: "lti:create-resource-link:custom-parameters-key-must-be-string",
        }),
        z.string({
          error: "lti:create-resource-link:custom-parameters-value-must-be-string",
        }),
        {
          error: "lti:create-resource-link:custom-parameters-must-be-a-key-value-map",
        },
      )
      .optional(),
  });

  @Expose()
  deploymentId: UUID;

  @Expose()
  resourceLink: string | undefined;

  @Expose()
  title?: string;

  @Expose()
  description?: string;

  @Expose()
  @Transform(({ obj }) => obj.customParameters)
  customParameters?: Record<string, string>;

  validate(): Either<ValidationErrors, void> {
    const { success, data, error } = CreateResourceLinkDto.createResourceLinkSchema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
