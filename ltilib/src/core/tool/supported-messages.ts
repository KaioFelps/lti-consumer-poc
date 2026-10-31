import { ClassProperties } from "common/src/types/class-properties.js";
import { AnyLtiRole } from "$/core/claims/enums/roles.js";
import { MessageType } from "$/core/claims/serialization.js";
import { MessagePlacement } from "$/core/tool/message-placement.js";

export type ILtiToolSupportedMessage = ClassProperties<LtiToolSupportedMessage>;

export class LtiToolSupportedMessage {
  public type: MessageType;
  public targetLinkUri?: URL;
  public label?: string;
  public iconUri?: string;
  public placements?: MessagePlacement[];
  public roles?: AnyLtiRole[];
  public customParameters?: Record<string, string>;

  public constructor(args: ILtiToolSupportedMessage) {
    Object.assign(this, args);
  }
}
