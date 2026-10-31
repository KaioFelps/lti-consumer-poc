import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { AnyLtiRole } from "$/core/claims/enums/roles.js";
import { MessageType } from "$/core/claims/serialization.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { Platform } from "$/core/platform.js";
import {
  PresentedLtiResourceLink,
  presentLtiResourceLink,
} from "$/core/presenters/resource-link.presenter.js";
import { LtiToolsRepository } from "$/core/repositories/tools.repository.js";
import { LtiResourceLink } from "$/core/resource-link.js";
import { LtiTool } from "$/core/tool.js";

export type GetLaunchLinksParams = {
  userRoles: AnyLtiRole[];
};

export type GetLaunchLinksFromResourceLinksParams = GetLaunchLinksParams & {
  resourceLinks: LtiResourceLink[];
};

type PresentLaunchLinksParams = {
  resourceLinks: LtiResourceLink[];
  toolsResourceLinkMessages: Map<string, LtiTool.SupportedMessage>;
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
          const toolMessages = tool.messages;
          const resourceLinkMessage = toolMessages.find(
            (msg) => msg.type === MessageType.resourceLink,
          );

          if (resourceLinkMessage) acc?.set(tool.id, resourceLinkMessage);

          return acc;
        }, new Map<LtiTool["id"], LtiTool.SupportedMessage>()),
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
