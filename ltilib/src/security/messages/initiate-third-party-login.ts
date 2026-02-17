import { ToolRecord } from "$/registration/tool-record";
import { Platform } from "../../core/platform";
import { LtiInitiationMessage } from "../lti-message";

export type CreateInitiateThirdPartyLoginRequestArgs = {
  tool: Readonly<ToolRecord>;
  platform: Readonly<Platform>;
  loginHint: string;
  targetLink: URL;
};

export class LtiInitiateThirdPartyLoginRequest implements LtiInitiationMessage {
  protected constructor(
    private tool: Readonly<ToolRecord>,
    private platform: Readonly<Platform>,
    private loginHint: string,
    private targetLink: URL,
  ) {}

  public static create({
    loginHint,
    platform,
    targetLink,
    tool,
  }: CreateInitiateThirdPartyLoginRequestArgs) {
    return new LtiInitiateThirdPartyLoginRequest(tool, platform, loginHint, targetLink);
  }

  public intoUrl(): URL {
    const url = new URL(this.tool.uris.initiate);
    url.searchParams.set("iss", this.platform.issuer);
    url.searchParams.set("login_hint", this.loginHint);
    url.searchParams.set("target_link_uri", this.targetLink.toString());
    return url;
  }
}
