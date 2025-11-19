import { ClassProperties } from "common/src/types/class-properties";

type LtiRegistrationInitiationRequestArgs =
  ClassProperties<LtiRegistrationInitiationRequest>;

export class LtiRegistrationInitiationRequest {
  /**
   * The full URI to ehe platform's openid configuration.
   */
  public platformOpenIdConfigurationUri: URL;
  /**
   * An optional platform's registration token. This is opaque to
   * the tool and must be sent back to the platform during the registration.
   */
  public platformRegistrationToken?: string;
  /**
   * The tool initiation register URI. This is likely provided by
   * the tool in a manner unspecified by the LTI Advantage specifications,
   * but that usually involves some UI in the tool that shares this
   * URI.
   */
  public toolInitiateRegisterUri: URL;

  public constructor(args: LtiRegistrationInitiationRequestArgs) {
    Object.assign(this, args);
  }

  public intoUrl(): URL {
    const url = new URL(this.toolInitiateRegisterUri);

    url.searchParams.set(
      "openid_configuration",
      this.platformOpenIdConfigurationUri.toString(),
    );

    if (this.platformRegistrationToken) {
      url.searchParams.set(
        "registration_token",
        this.platformRegistrationToken,
      );
    }

    return url;
  }
}
