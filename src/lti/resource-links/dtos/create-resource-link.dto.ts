import { Expose } from "class-transformer";
import { UUID } from "common/src/types/uuid";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

export class CreateResourceLinkDto implements DTO {
  protected static createResourceLinkSchema = z.object({
    deploymentId: z.uuid({
      error: "lti:create-resource-link:deployment-id-is-required-and-valid",
    }),
    resourceLink: z.url({
      error: "lti:create-resource-link:resource-link-is-valid-url",
    }),
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
      .object(
        z.record(
          z.string({
            error:
              "lti:create-resource-link:custom-parameters-key-must-be-string",
          }),
          z.string({
            error:
              "lti:create-resource-link:custom-parameters-value-must-be-string",
          }),
        ),
        {
          error:
            "lti:create-resource-link:custom-parameters-must-be-a-key-value-map",
        },
      )
      .optional(),
  });

  @Expose()
  deploymentId: UUID;

  @Expose()
  resourceLink: string;

  @Expose()
  title?: string;

  @Expose()
  description?: string;

  @Expose()
  customParameters?: Record<string, string>;

  validate(): Either<ValidationErrors, void> {
    const { success, data, error } =
      CreateResourceLinkDto.createResourceLinkSchema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
