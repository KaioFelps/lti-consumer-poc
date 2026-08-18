import { Expose } from "class-transformer";
import { either } from "fp-ts";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";
import { LineItemsContainerFilters } from "$/assignment-and-grade/container-filters";

const schema = z.object({
  resourceLinkId: z
    .uuid("lti:ags:line-items-container:errors:resource-link-id-must-be-uuid")
    .optional(),
  resourceId: z.uuid("lti:ags:line-items-container:errors:resource-id-must-be-uuid").optional(),
  tag: z.string("lti:ags:line-items-container:errors:tag-must-be-string").optional(),
  limit: z
    .int("lti:ags:line-items-container:errors:limit-must-be-integer")
    .nonnegative("lti:ags:line-items-container:errors:limit-must-be-non-negative")
    .optional(),
  page: z
    .int("lti:ags:line-items-container:errors:page-must-be-integer")
    .positive("lti:ags:line-items-container:errors:page-must-be-positive")
    .optional(),
});

export class LineItemsContainerFiltersDto implements DTO, Partial<LineItemsContainerFilters> {
  @Expose() resourceLinkId?: string;
  @Expose() resourceId?: string;
  @Expose() tag?: string;
  @Expose() limit?: number;
  @Expose() page?: number;

  validate() {
    const { success, data, error } = schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
