import { InvalidLineItemArgumentError } from "./invalid-line-item-argument.error";

/**
 * Line item cannot be attached to resource link because either don't they belong
 * to the same context or resource link is not owned by the tool which is
 * trying to perform this action.
 *
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0#resourcelinkid-and-binding-a-line-item-to-a-resource-link section 3.2.9 of the LTI AGS specification}
 */
export class CannotAttachResourceLinkError extends InvalidLineItemArgumentError {
  public constructor(reason: InvalidLineItemArgumentError.Codes["resourceLinkId"][number]) {
    super("resourceLinkId", reason);
    this._httpStatusCode = 404;
  }
}
