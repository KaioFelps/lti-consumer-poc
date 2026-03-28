import { Either } from "fp-ts/lib/Either";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { LineItemsContainerFilters } from "../container-filters";
import { LtiLineItem } from "../line-item";

export abstract class LtiLineItemsRepository {
  public abstract save(lineItem: LtiLineItem): Promise<Either<LtiRepositoryError, void>>;

  public abstract findByExternalResourceAndTag(
    resourceId: string,
    tag: string | undefined,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>>;

  public abstract findManyByResourceLink(
    resourceLinkId: LtiResourceLink["id"],
    limit: number,
  ): Promise<Either<LtiRepositoryError, LtiLineItem[]>>;

  public abstract findById(
    lineItemId: LtiLineItem["id"],
  ): Promise<Either<LtiRepositoryError, LtiLineItem>>;

  /**
   * Finds many line items that belongs to a given container. The platform's implementation
   * of this method must ensure:
   * - every line item is accessible to `tool` (see {@link LtiLineItem.isAccessibleToTool `LtiLineItem.isAccessibleToTool`});
   * - every line item belongs to `context` (see {@link LtiLineItem.belongsToContext `LtiLineItem.belongsToContext`}); and
   * - every filter present in `filters` is applied as an AND condition.
   *
   * @param context - The LTI context to which the line items must reside. (See [section 3.2 of LTI Core].)
   * @param tool - The LTI tool which is querying the line items. (See [section 3.1 of LTI Core].)
   * @param page - The current (1-based indexing) page.
   * @param limit - The maximum amount of line items that must be returned in the current page.
   * @param filters - LTI line items container available filters. (See [Container Request Filters].)
   *
   * @note Please note that missing any of the above requirements constitutes a non-conformancy
   * with LTI AGS specification.
   *
   * [Container Request Filters]: https://www.imsglobal.org/spec/lti-ags/v2p0#container-request-filters
   * [section 3.2 of LTI Core]: https://www.imsglobal.org/spec/lti/v1p3/#contexts-and-resources
   * [section 3.1 of LTI Core]: https://www.imsglobal.org/spec/lti/v1p3/#platforms-and-tools
   */
  public abstract fetchWithContainerFilters(
    context: Context,
    tool: LtiTool,
    limit: number,
    page: number,
    filters: Omit<LineItemsContainerFilters, "limit" | "page">,
  ): Promise<Either<LtiRepositoryError, LtiRepositoryPaginatedResponse<LtiLineItem>>>;
}
