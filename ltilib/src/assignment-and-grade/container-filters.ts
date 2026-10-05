import { ExternalLtiResource } from "$/advantage/external-resource";
import { LtiResourceLink } from "$/core/resource-link";

export type LineItemsContainerFilters = {
  /**
   * Limits the line items returned to only those associated to the specified
   * {@link LtiResourceLink `LtiResourceLink`}.
   *
   * @note Should be extracted from query parameters under `resourceLinkId` key.
   */
  resourceLinkId?: LtiResourceLink["id"];
  /**
   * Limits the line items returned to only those associated to the
   * specified {@link ExternalLtiResource `ExternalLtiResource`}.
   *
   * @note Should be extracted from query parameters under `resourceId` key.
   */
  resourceId?: ExternalLtiResource["externalToolResourceId"];
  /**
   * Limits the line items returned to only those marked with the given `tag`.
   *
   * @note Should be extracted from query parameters under `tag` key.
   */
  tag?: string;
  /**
   * Restricts the number of line items returned to `limit`.
   *
   * @note Should be extracted from query parameters under `limit` key.
   */
  limit?: number;
  /**
   * The current (1-based indexing) page of the container line items with given `filters`.
   *
   * @note Should be extracted from query parameters under `page` key.
   */
  page: number;
};

export type ResultsContainerFilters = {
  /**
   * Restricts the results to be returned to the one that belongs to
   * the user identified by `userId`.
   *
   * @note Must be extracted from query parameters under `user_id` key.
   */
  userId: string | undefined;
  /**
   * Restricts the amount of scores returned to `limit`.
   *
   * @note Must be extracted from query parameters under `limit` key.
   */
  limit: number | undefined;
  /**
   * The current (1-based indexing) page of the result container with given `filters`.
   *
   * @note Must be extracted from query parameters under the `page` key.
   */
  page: number;
};
