import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { MessagePlacement } from "../../core/tool/message-placement";

/**
 * An interface of the raw payload of a tool supported message
 * from an incoming request of LTI tool registration. I.e.,
 * each object from the `["https://purl.imsglobal.org/spec/lti-tool-configuration"].messages`
 * property from the [2.2.5 non normative example of LTI Dynamic Registration specification].
 *
 * [2.2.5 non normative example of LTI Dynamic Registration specification]: https://www.imsglobal.org/spec/lti-dr/v1p0#non-normative-example-0
 */
export type ToolConfigurationSupportedMessage = {
  type: MessageType;
  target_link_uri?: string;
  label?: string;
  // Many fields can have different values according to user's locale
  // support this may be interesting, but it's not required in order
  // for platform to be compliant.
  // [key: `label#${string}`]: string | undefined;
  icon_uri?: string;
  placements?: MessagePlacement[];
  roles?: AnyLtiRole[];
  custom_parameters?: Record<string, string>;
};
