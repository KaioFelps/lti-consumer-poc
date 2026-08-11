import { ClassProperties } from "common/src/types/class-properties";
import { AnyLtiRole } from "$/core/claims/enums/roles";
import { MessageType } from "$/core/claims/serialization";
import { MessagePlacement } from "$/core/tool/message-placement";

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
