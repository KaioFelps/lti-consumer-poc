import { Expose } from "class-transformer";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

export class DeployToolDto implements DTO {
  protected static deployToolSchema = z.object({
    label: z
      .string({ error: "lti:deploy-tool:errors:label-invalid-type" })
      .min(1, { error: "lti:deploy-tool:errors:label-too-short" })
      .max(255, { error: "lti:deploy-tool:errors:label-too-long" }),
    activeTab: z.string().optional(),
    withModalOpen: z.coerce.boolean().optional().default(false),
  });

  @Expose()
  public readonly label: string;

  @Expose()
  public readonly activeTab?: string;

  @Expose()
  public readonly withDeployModalOpen: boolean;

  validate(): Either<ValidationErrors, void> {
    const { success, error, data } = DeployToolDto.deployToolSchema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
