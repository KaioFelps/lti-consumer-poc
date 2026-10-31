import { MessagePlacement } from "$/core/tool/message-placement.js";
import { Platform } from "../platform.js";
import { LtiResourceLink } from "../resource-link.js";
import { LtiTool } from "../tool.js";

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
