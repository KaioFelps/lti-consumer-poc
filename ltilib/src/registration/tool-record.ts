import { ClassProperties } from "common/src/types/class-properties";
import { either } from "fp-ts";
import { IntoLtiClaim } from "$/claims/serialization";
import {
  type Contact,
  type DraftLtiDynamicToolConfiguration,
  type GrantType,
  LTI_TOOL_CONFIGURATION_KEY,
  LtiDynamicToolConfiguration,
  type ResponseType,
} from "./dynamic/tool-configuration";
import { InvalidToolConfigurationError } from "./errors/invalid-tool-configuration.error";
import { ToolSupportedMessage } from "./tool-supported-message";

type ToolRecordArgs = ClassProperties<ToolRecord>;

export class ToolRecord implements IntoLtiClaim {
  public readonly applicationType: "web" = "web";
  public readonly tokenEndpointAuthMethod: "private_key_jwt" =
    "private_key_jwt";

  /**
   * It is not stated by Open ID to be a UUID. oidc-provider uses nanoids, for instance.
   */
  public readonly id: string;
  public name: string;
  public responseTypes: ResponseType[];
  public grantTypes: GrantType[];
  public uris: {
    initiate: string;
    jwks: string;
    redirect: string[];
    homePage?: string;
    logo?: string;
    tos?: string;
    policy?: string;
  };
  public scope: string;
  public contacts?: Contact[];
  public ltiConfiguration: {
    domain: string;
    description?: string;
    deploymentsIds: string[];
    targetLinkUri: string;
    customParameters?: Record<string, string>;
    /**
     * The way the database schema is does not allow a same message type
     * being specified more than once. Every placements in which that
     * message should be available at MUST be declared on one single
     * `SupportedMessage` object, inside `placements` array.
     */
    messages: ToolSupportedMessage[];
    claims: string[];
  };
  public clientSecret?: string;

  protected constructor(args: ToolRecordArgs) {
    Object.assign(this, args);
  }

  public static create(data: ToolRecordArgs) {
    if (!data.uris.jwks && !data.clientSecret) {
      return either.left(
        new InvalidToolConfigurationError({
          client_secret:
            "Tool must have at least `client_secret` if `jwks_uri` is not present.",
        }),
      );
    }

    if (data.applicationType !== "web") {
      return either.left(
        new InvalidToolConfigurationError({
          application_type:
            'LTI Tools must have `application_type` set to "web".',
        }),
      );
    }

    if (data.tokenEndpointAuthMethod !== "private_key_jwt") {
      return either.left(
        new InvalidToolConfigurationError({
          token_endpoint_auth_method:
            'LTI Tool must have `token_endpoint_auth_method` set to "private_key_jwt"',
        }),
      );
    }

    return either.right(new ToolRecord(data));
  }

  public static createUnchecked(data: ToolRecordArgs) {
    return new ToolRecord(data);
  }

  /**
   * Serializes this record in a tool configuration response, as specified in
   * [section 3.6.1 Successful Registration].
   *
   * [section 3.6.1 Successful Registration]: https://www.imsglobal.org/spec/lti-dr/v1p0#successful-registration
   */
  intoLtiClaim(): LtiDynamicToolConfiguration {
    return {
      client_id: this.id.toString(),
      application_type: this.applicationType,
      client_name: this.name,
      grant_types: this
        .grantTypes as DraftLtiDynamicToolConfiguration["grant_types"],
      jwks_uri: this.uris.jwks,
      redirect_uris: this.uris.redirect,
      initiate_login_uri: this.uris.initiate,
      response_types: this
        .responseTypes as DraftLtiDynamicToolConfiguration["response_types"],
      scope: this.scope,
      token_endpoint_auth_method: this.tokenEndpointAuthMethod,
      contacts: this.contacts?.length === 0 ? undefined : this.contacts,
      logo_uri: this.uris.logo,
      policy_uri: this.uris.policy,
      tos_uri: this.uris.tos,
      client_uri: this.uris.homePage,
      [LTI_TOOL_CONFIGURATION_KEY]: {
        claims: this.ltiConfiguration.claims,
        domain: this.ltiConfiguration.domain,
        messages: this.ltiConfiguration.messages,
        target_link_uri: this.ltiConfiguration.targetLinkUri,
        custom_parameters: this.ltiConfiguration.customParameters,
        description: this.ltiConfiguration.description,
      },
    };
  }

  /**
   * Same as `intoLtiClaim`, but includes the given `deploymentId` (if it exists
   * in the stored record) as specified in [section 3.6.1 Successful Registration]
   *
   * [section 3.6.1 Successful Registration]: https://www.imsglobal.org/spec/lti-dr/v1p0#successful-registration
   *
   * @param deploymentId
   */
  intoLtiClaimWithDeployment(
    deploymentId: string,
  ): LtiDynamicToolConfiguration {
    const claims = this.intoLtiClaim();

    if (this.ltiConfiguration.deploymentsIds.includes(deploymentId)) {
      claims[LTI_TOOL_CONFIGURATION_KEY].deployment_id = deploymentId;
    }

    return claims;
  }
}
