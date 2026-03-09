import { LtilibError } from "$/core/errors/bases/ltilib.error";
import { LtiLineItem } from "../line-item";

/**
 * An error that means that either no line item exists with given `lineItemId` or
 * the tool did not have access to such line item.
 */
export class InaccessibleLineItemError extends LtilibError {
  public constructor(lineItemId: LtiLineItem["id"], options?: ErrorOptions) {
    super(404, `Could not address any line item with id "${lineItemId}".`, options);
  }
}
