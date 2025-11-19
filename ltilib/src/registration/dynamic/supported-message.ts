import { AnyLtiRole } from "$/claims";
import { MessageType } from "$/claims/serialization";
import { MessagePlacement } from "../enums/message-placement";

export type SupportedMessage = {
  type: MessageType;
  target_link_uri?: string;
  label?: string;
  [key: `label#${string}`]: string | undefined;
  icon_uri?: string;
  placements?: MessagePlacement[];
  roles?: AnyLtiRole[];
  custom_parameters?: Record<string, string>;
};
