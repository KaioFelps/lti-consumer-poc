type Reason = "doesnt_belong_to_tool" | "doesnt_belong_to_lineitem_context";

export class CannotAttachResourceLinkError extends Error {
  public readonly field = "resourceLinkId";
  public constructor(public readonly reason: Reason) {
    super(reason);
  }
}
