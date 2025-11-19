import { ClassProperties } from "common/src/types/class-properties";
import { MessageType } from "$/claims/serialization";
import { MessagePlacement } from "./enums/message-placement";

/**
 * LTI-specific OpenID configuration defined by [LTI Dynamic Linking] specification.
 * These data should be made available in the Authorization Server webfingers endpoint for
 * the OpenID configuration.
 *
 * [LTI Dynamic Linking]: https://www.imsglobal.org/spec/lti-dr/v1p0
 */
export class PlatformConfigurationMetadata {
  /**
   * The authorization server URL to be used as the `aud` claim
   * from `id_token`s when requesting an access token. If not specified,
   * the token endpoint itself will be used as the `aud` value.
   */
  public authorizationServer?: URL;
  /**
   * Name of the LMS within its vendor products. I.e., "moodle".
   */
  public productFamilyCode: string;
  /**
   * Version of the LMS.
   */
  public version: string;
  public messagesSupported: {
    type: MessageType;
    placements?: (
      | MessagePlacement.ContentArea
      | MessagePlacement.RichTextEditor
    )[];
  }[];
  /**
   * An optional list of variables available for variable substitution parameters.
   * See:
   * - [Custom properties and variable substitution]
   * - [Available custom variables and how to handle them]
   *
   * [Custom properties and variable substitution]: https://www.imsglobal.org/spec/lti/v1p3#custom-properties-and-variable-substitution
   * [Available custom variables and how to handle them]: https://www.imsglobal.org/spec/lti/v1p3#customproperty
   */
  variables?: string[];

  public constructor(metadata: ClassProperties<PlatformConfigurationMetadata>) {
    Object.assign(this, metadata);
  }

  public intoConfiguration() {
    return {
      authorization_server: this.authorizationServer,
      ["https://purl.imsglobal.org/spec/lti-platform-configuration"]: {
        product_family_code: this.productFamilyCode,
        version: this.version,
        messages_supported: this.messagesSupported,
        variables: this.variables,
      },
    };
  }
}
