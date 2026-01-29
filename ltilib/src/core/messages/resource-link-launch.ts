/**
 * Contains the implementation of LTI Resource Link Launch request, with
 * (almost) every available claim for this type of LTI message.
 *
 * Currently, it doesn't have support for [LIS claim] and [custom parameter substitution].
 *
 * [LIS claim]: https://www.imsglobal.org/spec/lti/v1p3/#learning-information-services-lis-claim
 * [custom parameter substitution]: https://www.imsglobal.org/spec/lti/v1p3/#customproperty
 */

import { ClassProperties } from "common/src/types/class-properties";
import ejs from "ejs";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import {
  AvailableLtiVersion,
  IntoLtiClaim,
  LTIClaimKey,
  MessageType,
  resolveClaimKey,
} from "ltilib/src/claims/serialization";
import { Context } from "$/core/context";
import { LtiResourceLink } from "$/core/resource-link";
import { UserIdentity, UserRoles } from "$/core/user-identity";
import { ToolRecord } from "$/registration/tool-record";
import { LtiSubmittableMessage } from "$/security/lti-message";
import {
  PrepareIdTokenError,
  prepareIdToken,
} from "$/security/prepare-id-token";
import { Platform } from "../platform";
import { MessageRequests } from ".";

type CreateFromLtiRecordArgs<CR = never> = {
  tool: ToolRecord;
  platform: Platform;
  /**
   * This identifies the user that started the LTI Launch. **Unless it is an anonymous launch,
   * this claim MUST be present**. The lack of it will be interpreted by
   * the LTI Tool as an anonymous launch.
   *
   * In the case of an anonymous launch, the platform **should** provide a `userRoles` array.
   * If not provided, it'll fallback to an empty array.
   */
  userIdentity?: UserIdentity<CR>;
  userRoles?: UserRoles<CR>;
  resourceLink: LtiResourceLink;
  nonce: string;
  state: string;
  context?: Context;
};

/**
 * @see {@link https://www.imsglobal.org/spec/lti/v1p3/#resource-link-launch-request-message Resource Link Launch Request Message}
 */
export class LTIResourceLinkLaunchRequest<
  CustomRoles = never,
  CustomContextType = never,
> implements IntoLtiClaim, LtiSubmittableMessage<PrepareIdTokenError>
{
  private readonly version = AvailableLtiVersion["1p3"];
  private readonly messageType = MessageType.resourceLink;

  protected constructor(
    private state: string,
    private nonce: string,
    private resourceLink: Readonly<LtiResourceLink>,
    private platform: Readonly<Platform>,
    private tool: Readonly<ToolRecord>,
    private resolvedTargetLink: URL,
    private resolvedUserRoles: Readonly<UserRoles<CustomRoles>>,
    private userIdentity?: Readonly<UserIdentity<CustomRoles>>,
    private context?: Context<CustomContextType>,
    private mentorScope?: string[],
    private launchPresentation?: MessageRequests.Presentation,
    /**
     * A platform may want to associate extra data about the resource link
     * that initiated the launch. This is the place to put these data.
     *
     * It's **not** possible to perform variable substitution through these claims.
     *
     * @see {@link https://www.imsglobal.org/spec/lti/v1p3/#custom-properties-and-variable-substitution Custom Properties}
     */
    public readonly customClaims: Record<string, string> = {},
    private vendorClaims?: MessageRequests.VendorExtraClaims,
  ) {}

  public static create<CustomRoles = never, CustomContextType = never>({
    tool,
    nonce,
    platform,
    state,
    userIdentity,
    resourceLink,
    userRoles: _userRoles,
    context,
  }: CreateFromLtiRecordArgs<CustomRoles>) {
    if (
      !tool.ltiConfiguration.deploymentsIds.includes(resourceLink.deploymentId)
    ) {
      // TODO: return some error
    }

    const resourceLinkMessage = tool.ltiConfiguration.messages.find(
      (message) => message.type === MessageType.resourceLink,
    );

    const userRoles = userIdentity?.roles ?? _userRoles ?? [];

    const userIsAllowedToLaunchMessage =
      !resourceLinkMessage?.roles ||
      resourceLinkMessage.roles.some((allowedRole) =>
        (userRoles as unknown[])?.includes(allowedRole),
      );

    if (!userIsAllowedToLaunchMessage) {
      // TODO: return some error
    }

    const targetLink = new URL(
      resourceLinkMessage?.targetLinkUri ?? tool.ltiConfiguration.targetLinkUri,
    );

    const relatedToolMessage = tool.ltiConfiguration.messages.find(
      (msg) => msg.type === MessageType.resourceLink,
    );

    const resolvedCustomClaims = {
      ...(tool.ltiConfiguration.customParameters ?? {}),
      ...resourceLink.customParameters,
      ...(relatedToolMessage?.customParameters ?? {}),
    } satisfies Record<string, string>;

    return new LTIResourceLinkLaunchRequest<CustomRoles, CustomContextType>(
      state,
      nonce,
      resourceLink,
      platform,
      tool,
      targetLink,
      userRoles,
      userIdentity,
      context,
      undefined,
      undefined,
      resolvedCustomClaims,
    );
  }

  /**
   * Sets the list of IDs from users whose data can be accessed
   * by the one performing the launch. E.g., auditors or parents that may have to see
   * statistic about their assigned students.
   */
  public setMentorScope(menteesIds: string[]) {
    this.mentorScope = menteesIds;
  }

  public setVendorClaims(claims: MessageRequests.VendorExtraClaims) {
    this.vendorClaims = claims;
  }

  public setContext(context: Context<CustomContextType>) {
    if (context.id !== this.resourceLink.contextId) {
      // TODO: return some error
    }

    this.context = context;
  }

  public setLaunchPresentation(
    presentation:
      | ClassProperties<MessageRequests.Presentation>
      | MessageRequests.Presentation,
  ) {
    if (presentation instanceof MessageRequests.Presentation) {
      this.launchPresentation = presentation;
      return;
    }

    const { documentTarget, height, locale, returnUrl, width } = presentation;
    this.launchPresentation = new MessageRequests.Presentation(
      documentTarget,
      width,
      height,
      returnUrl,
      locale,
    );
  }

  intoLtiClaim(): object {
    return {
      ...this.userIdentity?.intoLtiClaim(),
      [resolveClaimKey(LTIClaimKey.messageType)]: this.messageType.toString(),
      [resolveClaimKey(LTIClaimKey.version)]: this.version.toString(),
      [resolveClaimKey(LTIClaimKey.deploymentId)]:
        this.resourceLink.deploymentId,
      [resolveClaimKey(LTIClaimKey.targetLinkUri)]: this.resolvedTargetLink,
      [resolveClaimKey(LTIClaimKey.resourceLink)]: this.resourceLink,
      [resolveClaimKey(LTIClaimKey.roles)]: this.resolvedUserRoles,
      [resolveClaimKey(LTIClaimKey.context)]: this.context?.intoLtiClaim(),
      [resolveClaimKey(LTIClaimKey.platformInstanceData)]:
        this.platform.instance?.intoLtiClaim(),
      [resolveClaimKey(LTIClaimKey.mentoredUsers)]: this.mentorScope,
      [resolveClaimKey(LTIClaimKey.launchPresentation)]:
        this.launchPresentation?.intoLtiClaim(),
      [resolveClaimKey(LTIClaimKey.customs)]: this.customClaims,
      ...this.vendorClaims?.intoLtiClaim(),
    };
  }

  public async intoForm() {
    return pipe(
      await prepareIdToken({
        platform: this.platform,
        claims: this.intoLtiClaim(),
        nonce: this.nonce,
        targetTool: this.tool,
      }),
      either.map((idToken) => {
        const data = {
          idToken: idToken,
          state: this.state,
          targetUrl: this.resolvedTargetLink.toString(),
        };

        return ejs.render(launchForm, data);
      }),
    );
  }
}

const launchForm = `<form id="ltiLaunchForm" name="ltiLaunchForm" action="<%= targetUrl %>" method="post">
    <input type="hidden" name="id_token" value="<%= idToken %>">
    <input type="hidden" name="state" value="<%= state %>">
</form>
<script type="text/javascript">
    document.ltiLaunchForm.submit();
</script>
`;
