import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { MessagePlacement } from "../enums/message-placement";

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
