/**
 * This file contains a class for preparing an LTI Resource Link Launch request, with
 * (almost) every available claim for this type of LTI message.
 *
 * Currently, it doesn't have support for [LIS claim] and [custom parameter substitution].
 *
 * [LIS claim]: https://www.imsglobal.org/spec/lti/v1p3/#learning-information-services-lis-claim
 * [custom parameter substitution]: https://www.imsglobal.org/spec/lti/v1p3/#customproperty
 */

import { ClassProperties } from "common/src/types/class-properties";
import {
  AnyLtiRole,
  ContextClaim,
  LaunchPresentationClaim,
  PlatformInstanceClaim,
  UserIdentityClaim,
  VendorExtraClaims,
} from "ltilib/src/claims";
import {
  AvailableLtiVersion,
  IntoLtiClaim,
  LTIClaimKey,
  MessageTypeClaim,
  resolveClaimKey,
} from "ltilib/src/claims/serialization";

/**
 * See: https://www.imsglobal.org/spec/lti/v1p3/#resource-link-launch-request-message
 */
export class LTIResourceLinkLaunchRequest<
  CustomRoles = never,
  CustomContextType = never,
> implements IntoLtiClaim
{
  private readonly version = AvailableLtiVersion["1p3"];
  private readonly messageType = MessageTypeClaim.resourceLink;

  private constructor(
    /**
     * This ID is set by the platform when the tool is deployed.
     */
    public deploymentId: string,
    /**
     * This must be the tool's launch endpoint.
     */
    public targetLink: URL,
    /**
     * This object describes an instance of a resource link placement, i.e.,
     * an execution of the tool somewhere in the platform (e.g., the platform
     * execution as one activity in an Math Class course).
     */
    public resourceLink: {
      /**
       * An unique and stable ID that identifies the resource link placement inside the platform
       */
      id: string;
      /**
       * The title of the resource link (e.g., "Marília de Dirceu Quiz").
       */
      title?: string;
      /**
       * A sentence describing the activity in more details
       * (e.g., "A quiz about the forth and fifth chapters of Marília de Dirceu book." or instructions
       * on how to complete the activity).
       */
      description?: string;
    },
    /**
     * This claim contains a list of the roles the user has within the context that the launch is happening.
     * It may be empty. If not empty, at least one role must be a valid LTI role. Custom roles are accepted,
     * but must also be full URIs.
     *
     * Consider making an enum with your platforms available roles and passing to the generic `CustomRoles`
     * parameter to make this type-safe.
     */
    public roles: [] | [AnyLtiRole, ...(CustomRoles | AnyLtiRole)[]],
    /**
     * This identifies the user that started the LTI Launch. **Unless it is an anonymous launch,
     * this claim MUST be present**. The lack of it will be interpreted by
     * the LTI Tool as an anonymous launch.
     */
    public userIdentity?: UserIdentityClaim,
    /**
     * This field is an object that describes the context within which the launch is occurring.
     */
    public context?: ContextClaim<CustomContextType>,

    /**
     * Data about **the instance** of the platform that started the launch. Note that
     * a single platform may have multiple (virtual) intances. See [multitenancy].
     *
     * [multitenancy]: https://www.cloudflare.com/learning/cloud/what-is-multitenancy/
     */
    public platformInstance?: PlatformInstanceClaim,
    /**
     * This field is a list of user's IDs whose data can be accessed
     * by the user performing the launch. E.g., auditors or parents that may have to see
     * statistic about their assigned students.
     */
    public mentorScope?: string[],
    /**
     * Metadata about how the platform expects to display the launch content.
     */
    public launchPresentation?: LaunchPresentationClaim,
    /**
     * A platform may want to associate extra data about the resource link
     * that initiated the launch. This is the place to put these data.
     */
    public customClaims?: Record<string, string>,
    /**
     * A platform vendor may add extra claims, it's not recommended though.
     * In the case it decides to include extra claims, it must declare the predicate of
     * each vendor claim (it must be a full resolved and unique URL, just like LTI's predicades).
     */
    public vendor?: VendorExtraClaims,
  ) {}

  public static create<CustomRoles = never, CustomContextType = never>(
    args: ClassProperties<
      LTIResourceLinkLaunchRequest<CustomRoles, CustomContextType>
    >,
  ): LTIResourceLinkLaunchRequest<CustomRoles, CustomContextType> {
    return new LTIResourceLinkLaunchRequest<CustomRoles, CustomContextType>(
      args.deploymentId,
      args.targetLink,
      args.resourceLink,
      args.roles,
      args.userIdentity,
      args.context,
      args.platformInstance,
      args.mentorScope,
      args.launchPresentation,
      args.customClaims,
      args.vendor,
    );
  }

  intoLtiClaim(): object {
    return {
      ...this.userIdentity?.intoLtiClaim(),
      [resolveClaimKey(LTIClaimKey.messageType)]: this.messageType.toString(),
      [resolveClaimKey(LTIClaimKey.version)]: this.version.toString(),
      [resolveClaimKey(LTIClaimKey.deploymentId)]: this.deploymentId,
      [resolveClaimKey(LTIClaimKey.targetLinkUri)]: this.targetLink,
      [resolveClaimKey(LTIClaimKey.resourceLink)]: this.resourceLink,
      [resolveClaimKey(LTIClaimKey.roles)]: this.roles,
      [resolveClaimKey(LTIClaimKey.context)]: this.context?.intoLtiClaim(),
      [resolveClaimKey(LTIClaimKey.platformInstanceData)]:
        this.platformInstance?.intoLtiClaim(),
      [resolveClaimKey(LTIClaimKey.mentoredUsers)]: this.mentorScope,
      [resolveClaimKey(LTIClaimKey.launchPresentation)]:
        this.launchPresentation?.intoLtiClaim(),
      [resolveClaimKey(LTIClaimKey.customs)]: this.customClaims,
      ...this.vendor?.intoLtiClaim(),
    };
  }
}
