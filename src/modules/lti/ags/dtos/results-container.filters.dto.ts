import { Expose } from "class-transformer";
import { either } from "fp-ts";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";
import { ResultsContainerFilters } from "$/assignment-and-grade/container-filters";

const schema = z.object({
  userId: z.uuid("lti:ags:results-container:errors:user-id-must-be-uuid").optional(),
  limit: z.coerce
    .number("lti:ags:container:errors:limit-must-be-integer")
    .int("lti:ags:container:errors:limit-must-be-integer")
    .nonnegative("lti:ags:container:errors:limit-must-be-non-negative")
    .optional(),
  page: z.coerce
    .number("lti:ags:container:errors:page-must-be-integer")
    .int("lti:ags:container:errors:page-must-be-integer")
    .positive("lti:ags:container:errors:page-must-be-positive")
    .optional(),
});

export class ResultsContainerFiltersDto implements DTO, Partial<ResultsContainerFilters> {
  @Expose() userId?: string;
  @Expose() limit?: number;
  @Expose() page?: number;

  validate() {
    const { success, data, error } = schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return either.right(undefined);
  }
}
