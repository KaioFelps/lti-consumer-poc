import { ToolSupportedMessage } from "$/registration/tool-supported-message";

export type PresentedLtiToolSupportedMessage = {
  type: string;
  targetLinkUri?: string;
  label?: string;
  iconUri?: string;
  placements?: string[];
  requiredRoles?: string[];
  customParameters?: Record<string, string>;
};

export class LtiToolSupportedMessagePresenter {
  public static present(entity: ToolSupportedMessage): PresentedLtiToolSupportedMessage {
    return {
      type: entity.type.toString(),
      targetLinkUri: entity.targetLinkUri,
      label: entity.label,
      iconUri: entity.iconUri,
      placements: entity.placements?.map(toString),
      requiredRoles: entity.roles?.map(toString),
      customParameters: entity.customParameters,
    };
  }
}
