import { MessagePlacement } from "$/registration/enums/message-placement";
import { ToolSupportedMessage } from "$/registration/tool-supported-message";
import { Platform } from "../platform";
import { LtiResourceLink } from "../resource-link";

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
  message?: ToolSupportedMessage,
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
