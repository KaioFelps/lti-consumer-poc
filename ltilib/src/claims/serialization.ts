/**
 * These are utility enums and constants that might be used by the classes to
 * map themselves into LTI valid claims (keys and values).
 */

export interface IntoLtiClaim {
  /**
   * Serialize a class into a valid LTI claim according to the specifications.
   *
   * A resolved object's keys and values should be strictly the same as those defined
   * by LTI (from casing to naming convention).
   */
  intoLtiClaim(): object;
}

const LTI_PREFIX = "https://purl.imsglobal.org";
const LTI_CLAIM_PREFIX = `${LTI_PREFIX}/spec/lti/claim`;

/**
 * The type of the LTI Message.
 */
export enum MessageType {
  resourceLink = "LtiResourceLinkRequest",
  deepLinking = "LtiDeepLinkingRequest",
}

/**
 * The LTI version to which the message belongs.
 */
export enum AvailableLtiVersion {
  "1p3" = "1.3.0",
}

/**
 * The available LTI claims that any LTI Message or token may contain.
 */
export enum LTIClaimKey {
  messageType = "message_type",
  version = "version",
  deploymentId = "deployment_id",
  targetLinkUri = "target_link_uri",
  resourceLink = "resource_link",
  roles = "roles",
  context = "context",
  platformInstanceData = "tool_platform",
  mentoredUsers = "role_scope_mentor",
  launchPresentation = "launch_presentation",
  learningInformationServices = "lis",
  customs = "custom",
}

export function resolveClaimKey(key: LTIClaimKey): string {
  return `${LTI_CLAIM_PREFIX}/${key.toString()}`;
}
