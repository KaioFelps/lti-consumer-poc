/**
 * Message placements are the contexts (places in the UI) in which message of a given
 * type can be made available.
 *
 * When declared by a LTI Consumer, it's a way of informing LTI Tools the contexts
 * that this consumer supports to place the message.
 *
 * See: https://www.imsglobal.org/spec/lti-dr/v1p0#placements-for-message-type-ltideeplinkingrequest
 */
export enum MessagePlacement {
  ContentArea = "ContentArea",
  RichTextEditor = "RichTextEditor",
}
