import { LtiInitiationMessage } from "$/security/lti-message";
import {
  CreateInitiateThirdPartyLoginRequestArgs,
  LtiInitiateThirdPartyLoginRequest,
} from "$/security/messages/initiate-third-party-login";
import type { LTIResourceLinkLaunchRequest } from "./resource-link-launch";

type CreateInitiateLaunchRequestArgs = CreateInitiateThirdPartyLoginRequestArgs & {
  /**
   * The same deployment ID that will be passed to the {@link LTIResourceLinkLaunchRequest}
   * further on.
   *
   * @see {@link https://www.imsglobal.org/spec/lti/v1p3/#lti_deployment_id-login-parameter}
   */
  deploymentId?: string;
  /**
   * Information a platform may want or need to receive back in the subsequent
   * message.
   *
   * @see {@link https://www.imsglobal.org/spec/lti/v1p3/#lti_message_hint-login-parameter}
   */
  ltiMessageHint?: string;
};

export class InitiateLaunchRequest implements LtiInitiationMessage {
  protected constructor(
    private initiateLoginRequest: LtiInitiateThirdPartyLoginRequest,
    private clientId: string,
    private deploymentId?: string,
    private ltiMessageHint?: string,
  ) {}

  public static create({ deploymentId, ltiMessageHint, ...args }: CreateInitiateLaunchRequestArgs) {
    const initiateLoginRequest = LtiInitiateThirdPartyLoginRequest.create(args);
    return new InitiateLaunchRequest(
      initiateLoginRequest,
      args.tool.id,
      deploymentId,
      ltiMessageHint,
    );
  }

  public intoUrl() {
    const url = this.initiateLoginRequest.intoUrl();

    if (this.ltiMessageHint) {
      url.searchParams.set("lti_message_hint", this.ltiMessageHint);
    }

    if (this.deploymentId) {
      url.searchParams.set("lti_deployment_id", this.deploymentId);
    }

    url.searchParams.set("client_id", this.clientId);

    return url;
  }
}
