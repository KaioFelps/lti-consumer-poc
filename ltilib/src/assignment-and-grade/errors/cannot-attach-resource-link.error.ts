import { LtilibError } from "$/core/errors/bases/ltilib.error";

type Reason = "doesnt_belong_to_tool" | "doesnt_belong_to_lineitem_context";

/**
 * Line item cannot be attached to resource link because either don't they belong
 * to the same context or resource link is not owned by the tool which is
 * trying to perform this action.
 *
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0#resourcelinkid-and-binding-a-line-item-to-a-resource-link section 3.2.9 of the LTI AGS specification}
 */
export class CannotAttachResourceLinkError extends LtilibError {
  public readonly field = "resourceLinkId";
  public constructor(public readonly reason: Reason) {
    super(404, reason);
  }
}
