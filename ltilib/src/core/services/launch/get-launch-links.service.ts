import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { Platform } from "$/core/platform";
import {
  PresentedLtiResourceLink,
  presentLtiResourceLink,
} from "$/core/presenters/resource-link.presenter";
import { LtiToolsRepository } from "$/core/repositories/tools.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { ToolRecord } from "$/registration/tool-record";
import { ToolSupportedMessage } from "$/registration/tool-supported-message";

export type GetLaunchLinksParams = {
  userRoles: AnyLtiRole[];
};

export type GetLaunchLinksFromResourceLinksParams = GetLaunchLinksParams & {
  resourceLinks: LtiResourceLink[];
};

type PresentLaunchLinksParams = {
  resourceLinks: LtiResourceLink[];
  toolsResourceLinkMessages: Map<string, ToolSupportedMessage>;
};

export class GetLaunchLinksService {
  public constructor(
    private platform: Platform,
    private ltiToolsRepository: LtiToolsRepository,
  ) {}

  /**
   * Generates launch links from given `resourceLinks`.
   */
  public async execute({
    resourceLinks,
    userRoles,
  }: GetLaunchLinksFromResourceLinksParams): Promise<
    Either<LtiRepositoryError, PresentedLtiResourceLink[]>
  > {
    const linksIds = resourceLinks.map((link) => link.id);

    const _toolsResourceLinkMessages = pipe(
      await this.ltiToolsRepository.findToolsOwningResourceLinks(linksIds),
      e.map((tools) =>
        tools.reduce((acc, tool) => {
          const toolMessages = tool.ltiConfiguration.messages;
          const resourceLinkMessage = toolMessages.find(
            (msg) => msg.type === MessageType.resourceLink,
          );

          if (resourceLinkMessage) acc?.set(tool.id, resourceLinkMessage);

          return acc;
        }, new Map<ToolRecord["id"], ToolSupportedMessage>()),
      ),
    );

    if (e.isLeft(_toolsResourceLinkMessages)) return _toolsResourceLinkMessages;

    const toolsResourceLinkMessages = _toolsResourceLinkMessages.right;

    resourceLinks = resourceLinks.filter((link) => {
      const message = toolsResourceLinkMessages.get(link.toolId);
      return (
        !message ||
        !message.roles ||
        message.roles.some((requiredRole) => userRoles.includes(requiredRole))
      );
    });

    const presentedLaunchLinks = this.presentLaunchLinks({
      resourceLinks,
      toolsResourceLinkMessages,
    });

    return e.right(presentedLaunchLinks);
  }

  private presentLaunchLinks({
    resourceLinks,
    toolsResourceLinkMessages,
  }: PresentLaunchLinksParams) {
    const presentedResourceLinks = resourceLinks.map((link) => {
      const message = toolsResourceLinkMessages.get(link.toolId);
      return presentLtiResourceLink(link, this.platform, message);
    });

    return presentedResourceLinks;
  }
}
