import { Either } from "fp-ts/lib/Either";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { LineItemsContainerFilters } from "../container-filters";
import { LtiLineItem } from "../line-item";

export abstract class LtiLineItemsRepository {
  /**
   * Saves a new instance of {@link LtiLineItem `LtiLineItem`}.
   *
   * @param lineItem The line item to be persisted.
   * @param tool The tool that owns this line item. A platform may use this to enforce
   * tool ownership further on. (E.g.: when no `resourceId` nor `resourceLinkId` are
   * provided, a platform's model specific field might store the tool ID for this purpose.)
   */
  public abstract create(
    lineItem: LtiLineItem,
    tool: LtiTool,
  ): Promise<Either<LtiRepositoryError, void>>;

  /**
   * Finds one or zero line items that matches with `resourceLinkId`, `resourceId`, and `tag`,
   * belongs to `context` and is accessible to `tool`.
   *
   * While the [specification encourages tools to avoid duplicating line items], a platform
   * MAY decide to use the provided parameters to provide idempotency and reuse an existing
   * line item that matches the tool's requirements. Note that, in this case, the platform
   * MUST ensure that the line item belongs/is accessible to the `tool`.
   *
   * @param tool The tool to which the returned line item must be accessible to.
   * (This can be done either through platform-specific persistance models or by using
   * {@link LtiLineItem.isAccessibleToTool `LtiLineItem.isAccessibleToTool`} if either a
   * resource or a resource link has been correctly set up to the line item upon creation.)
   * @param context The context to which the returned line item must belong.
   * @param resourceLinkId The `resourceLinkId` that the returned line item must be associated to.
   * @param resourceId The `resourceId` that the returned line item must be associated to.
   * @param tag The `tag` that the returned line item must have.
   *
   * [specification encourages tools to avoid duplicating line items]: https://www.imsglobal.org/spec/lti-ags/v2p0#course-copy-and-export-import
   */
  public abstract findExisting(
    tool: LtiTool,
    context: Context<unknown>,
    resourceLinkId: string | undefined,
    resourceId: string | undefined,
    tag: string | undefined,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>>;

  /**
   * Finds at most `limit` line items associated to the resource link identified by
   * `resourceLinkId`.
   *
   * @param resourceLinkId - The identifier of the resource link that the line items must be associated to
   * @param context - The context to which the resource link belongs to — or that has been passed as override
   * to the service calling this repository. Might be used to restore the line item from the data storage.
   * @param limit - The maximum amount of tuples that must be returned by this method.
   */
  public abstract findManyByResourceLink(
    resourceLinkId: LtiResourceLink["id"],
    context: Context<unknown>,
    limit: number,
  ): Promise<Either<LtiRepositoryError, LtiLineItem[]>>;

  public abstract findById(
    lineItemId: LtiLineItem["id"],
    context: Context<unknown>,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>>;

  /**
   * Finds many line items that belongs to a given container. The platform's implementation
   * of this method must ensure:
   * - every line item is accessible to `tool` (see {@link LtiLineItem.isAccessibleToTool `LtiLineItem.isAccessibleToTool`});
   * - every line item belongs to `context` (see {@link LtiLineItem.belongsToContext `LtiLineItem.belongsToContext`}); and
   * - every filter present in `filters` is applied as an AND condition.
   *
   * @param context - The LTI context in which the line items must reside. (See [section 3.2 of LTI Core].)
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
    context: Context<unknown>,
    tool: LtiTool,
    limit: number,
    page: number,
    filters: Omit<LineItemsContainerFilters, "limit" | "page">,
  ): Promise<Either<LtiRepositoryError, LtiRepositoryPaginatedResponse<LtiLineItem>>>;
}
