import type { LtiTool } from "$/core/tool";

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
  public static present(entity: LtiTool.SupportedMessage): PresentedLtiToolSupportedMessage {
    return {
      type: entity.type.toString(),
      targetLinkUri: entity.targetLinkUri?.toString(),
      label: entity.label,
      iconUri: entity.iconUri,
      placements: entity.placements?.map(toString),
      requiredRoles: entity.roles?.map(toString),
      customParameters: entity.customParameters,
    };
  }
}
