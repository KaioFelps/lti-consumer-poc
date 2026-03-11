import { MessagePlacement } from "$/core/tool/message-placement";
import { Platform } from "../platform";
import { LtiResourceLink } from "../resource-link";
import { LtiTool } from "../tool";

export type PresentedLtiResourceLink = {
  id: string;
  url: string;
  title?: string;
  description?: string;
  placements: MessagePlacement[];
};

export function presentLtiResourceLink(
  link: LtiResourceLink,
  platform: Platform,
  message?: LtiTool.SupportedMessage,
): PresentedLtiResourceLink {
  const placements = message?.placements;

  return {
    id: link.id,
    url: platform.initiateLaunchEndpoint(link.id),
    title: link.title,
    description: link.description,
    placements: placements ?? [],
  } satisfies PresentedLtiResourceLink;
}
