import { ExternalLtiResource } from "$/advantage/external-resource";
import { LtiResourceLink } from "$/core/resource-link";

export type LineItemsContainerFilters = {
  /**
   * Limits the line items returned to only those associated to the specified
   * {@link LtiResourceLink `LtiResourceLink`}.
   */
  resourceLinkId?: LtiResourceLink["id"];
  /**
   * Limits the line items returned to only those associated to the
   * specified {@link ExternalLtiResource `ExternalLtiResource`}.
   */
  resourceId?: ExternalLtiResource["externalToolResourceId"];
  /**
   * Limits the line items returned to only those marked with the given `tag`.
   */
  tag?: string;
  /**
   * Restricts the number of line items returned to `limit`.
   */
  limit?: number;
  /**
   * The current (1-based indexing) page of the container line items with given `filters`.
   */
  page: number;
};
