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

  /**
   * Updates every field of line item identified by `lineItem.id`.
   * - It must unset fields that are undefined (but existed previously).
   * - It must return a {@link LtiRepositoryError `LtiRepositoryError`} of type `NotFound`
   * if there is no line item of id `lineItem.id` stored.
   * - It must **not** create a new line item.
   * - It must ensure that `lineItem` is owned by `tool`. (No changes must be applied otherwise,
   * and a `NotFound` {@link LtiRepositoryError `LtiRepositoryError`} must be returned.)
   * - If the platform uses some model for persisting tool's resources, then a new resource
   * should be created if the new `resourceId` doesn't exist in the platform. It mustn't be
   * ignored.
   *
   * @param lineItem The payload of changes that must be applied to the line item identified
   * by `lineItem.id`. Every property must be applied, unless otherwise stated by the docstrings.
   * `null` or `undefined` values must not be ignored, but unset that value in the datastore.
   * @param tool The tool that owns line item.
   */
  public abstract update(
    lineItem: LtiLineItem.UpdateRecord,
    tool: LtiTool,
    context: Context<unknown>,
  ): Promise<Either<LtiRepositoryError, LtiLineItem>>;

  /**
   * Deletes the line item identified by `lineItemId` from the platform's datastore.
   * - It must ensure that the line item belongs to `tool`. (Otherwise, the line item must not
   * be deleted, but **no errors must be returned** at all.)
   * - If there is no line item of id `lineItemId` stored, it must **not** return any error.
   *
   * @param lineItemId The ID of the line item to be deleted.
   * @param tool The tool that owns the line item being deleted.
   */
  public abstract delete(
    lineItemId: LtiLineItem["id"],
    tool: LtiTool,
  ): Promise<Either<LtiRepositoryError, void>>;
}
