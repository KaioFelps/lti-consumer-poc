import { Expose } from "class-transformer";
import { type UUID } from "common/src/types/uuid";
import { either } from "fp-ts";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

const schema = z.object({
  lineItemId: z
    .uuid("lti:ags:line-items:errors:line-item-id-must-be-uuid")
    .transform((value) => value as UUID),
});

export class FindLineItemByIdParamsDto implements DTO {
  @Expose() lineItemId!: UUID;

  validate() {
    const { success, data, error } = schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
