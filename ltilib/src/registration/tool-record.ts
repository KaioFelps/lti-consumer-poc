import { ClassProperties } from "common/src/types/class-properties";
import { generateUUID, type UUID } from "common/src/types/uuid";
import { either } from "fp-ts";
import { IntoLtiClaim } from "$/claims/serialization";
import { SupportedMessage } from "./dynamic/supported-message";
import {
  type Contact,
  type GrantType,
  LTI_CONFIGURATION_KEY,
  type LtiDynamicToolConfiguration,
  type ResponseType,
} from "./dynamic/tool-configuration";
import { InvalidToolConfigurationError } from "./errors/invalid-tool-configuration.error";

type ToolRecordArgs = ClassProperties<ToolRecord>;

export class ToolRecord implements IntoLtiClaim {
  public readonly applicationType: "web" = "web";
  public readonly tokenEndpointAuthMethod: "private_key_jwt" =
    "private_key_jwt";

  private constructor(
    public readonly id: UUID,
    public name: string,
    public responseTypes: ResponseType[],
    public grantTypes: GrantType[],
    public uris: {
      initiate: string;
      launch: string;
      jwks: string;
      redirect: string[];
      homePage?: string;
      logo?: string;
      tos?: string;
      policy?: string;
    },
    public scope: string,
    public contacts: Contact[],
    public ltiConfiguration: {
      domain: string;
      description?: string;
      deploymentsIds: string[];
      targetLinkUri: string;
      customParameters?: Record<string, string>;
      messages: SupportedMessage[];
      claims: string[];
    },
    public clientSecret?: string,
  ) {}

  public static create(data: Omit<ToolRecordArgs, "id">) {
    if (!data.uris.jwks && !data.clientSecret) {
      return either.left(
        new InvalidToolConfigurationError(
          "Tool must have `jwks_uri` or `client_secret` values.",
        ),
      );
    }

    return new ToolRecord(
      generateUUID(),
      data.name,
      data.responseTypes,
      data.grantTypes,
      data.uris,
      data.scope,
      data.contacts,
      data.ltiConfiguration,
      data.clientSecret,
    );
  }

  public static createUnchecked(data: ToolRecordArgs) {
    return new ToolRecord(
      data.id,
      data.name,
      data.responseTypes,
      data.grantTypes,
      data.uris,
      data.scope,
      data.contacts,
      data.ltiConfiguration,
      data.clientSecret,
    );
  }

  /**
   * Serializes this record in a tool configuration response, as specified in
   * [section 3.6.1 Successful Registration].
   *
   * [section 3.6.1 Successful Registration]: https://www.imsglobal.org/spec/lti-dr/v1p0#successful-registration
   */
  intoLtiClaim(): object {
    return {
      application_type: this.applicationType,
      client_name: this.name,
      grant_types: this
        .grantTypes as LtiDynamicToolConfiguration["grant_types"],
      jwks_uri: this.uris.jwks,
      redirect_uris: this.uris.redirect,
      response_types: this
        .responseTypes as LtiDynamicToolConfiguration["response_types"],
      scope: this.scope,
      token_endpoint_auth_method: this.tokenEndpointAuthMethod,
      client_id: this.id.toString(),
      contacts: this.contacts.length === 0 ? undefined : this.contacts,
      logo_uri: this.uris.logo,
      policy_uri: this.uris.policy,
      tos_uri: this.uris.tos,
      client_uri: this.uris.homePage,
      [LTI_CONFIGURATION_KEY]: {
        claims: this.ltiConfiguration.claims,
        domain: this.ltiConfiguration.domain,
        messages: this.ltiConfiguration.messages,
        target_link_uri: this.ltiConfiguration.targetLinkUri,
        custom_parameters: this.ltiConfiguration.customParameters,
        description: this.ltiConfiguration.description,
      },
    } satisfies LtiDynamicToolConfiguration;
  }

  /**
   * Same as `intoLtiClaim`, but includes the given `deploymentId` (if it exists
   * in the stored record) as specified in [section 3.6.1 Successful Registration]
   *
   * [section 3.6.1 Successful Registration]: https://www.imsglobal.org/spec/lti-dr/v1p0#successful-registration
   *
   * @param deploymentId
   */
  intoLtiClaimWithDeployment(deploymentId: string): object {
    const claims = this.intoLtiClaim() as LtiDynamicToolConfiguration;

    if (this.ltiConfiguration.deploymentsIds.includes(deploymentId)) {
      claims[LTI_CONFIGURATION_KEY].deployment_id = deploymentId;
    }

    return claims;
  }
}
