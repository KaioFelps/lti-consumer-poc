import { ClassProperties } from "common/src/types/class-properties";
import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { MessagePlacement } from "./enums/message-placement";

type ToolSupportedMessageArgs = ClassProperties<ToolSupportedMessage>;
export class ToolSupportedMessage {
  public type: MessageType;
  public targetLinkUri?: string;
  public label?: string;
  public iconUri?: string;
  public placements?: MessagePlacement[];
  public roles?: AnyLtiRole[];
  public customParameters?: Record<string, string>;

  public constructor(args: ToolSupportedMessageArgs) {
    Object.assign(this, args);
  }
}
