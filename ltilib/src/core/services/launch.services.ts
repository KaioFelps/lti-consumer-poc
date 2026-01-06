import { either, taskEither } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { eitherPromiseToTaskEither as promiseToTaskEither } from "@/lib/fp-ts";
import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { ToolRecord } from "$/registration/tool-record";
import { ToolSupportedMessage } from "$/registration/tool-supported-message";
import { Platform } from "../platform";
import {
  type PresentedLtiResourceLink,
  presentLtiResourceLink,
} from "../presenters/resource-link.presenter";
import { LtiResourceLinksRepository } from "../repositories/resource-links.repository";
import { LtiToolsRepository } from "../repositories/tools.repository";

export class LtiLaunchServices<ExternalError> {
  public constructor(
    private resourceLinksRepository: LtiResourceLinksRepository<ExternalError>,
    private ltiToolsRepository: LtiToolsRepository<ExternalError>,
    private platform: Platform,
  ) {}

  public async getLtiLinks(
    userRoles: AnyLtiRole[],
  ): Promise<Either<ExternalError, PresentedLtiResourceLink[]>> {
    const toolsAndMessages = await pipe(
      promiseToTaskEither(() => this.resourceLinksRepository.findMany()),
      taskEither.map((resourceLinks) =>
        pipe(
          promiseToTaskEither(() =>
            this.ltiToolsRepository.findToolsOwningResourceLinks(
              resourceLinks.map((link) => link.id),
            ),
          ),
          taskEither.map((tools) =>
            tools.reduce((acc, tool) => {
              const toolMessages = tool.ltiConfiguration.messages;
              const resourceLinkMessage = toolMessages.find(
                (msg) => msg.type === MessageType.resourceLink,
              );

              if (resourceLinkMessage) acc?.set(tool.id, resourceLinkMessage);

              return acc;
            }, new Map<ToolRecord["id"], ToolSupportedMessage>()),
          ),
          taskEither.map((tools) => [resourceLinks, tools] as const),
        ),
      ),
      taskEither.flattenW,
    )();

    if (either.isLeft(toolsAndMessages)) return toolsAndMessages;
    let [resourceLinks, toolsResourceLinkMessages] = toolsAndMessages.right;

    resourceLinks = resourceLinks.filter((link) => {
      const message = toolsResourceLinkMessages.get(link.toolId);
      return (
        !message ||
        !message.roles ||
        message.roles.some((requiredRole) => userRoles.includes(requiredRole))
      );
    });

    const presentedResourceLinks = resourceLinks.map((link) => {
      const message = toolsResourceLinkMessages.get(link.toolId);
      return presentLtiResourceLink(link, this.platform, message);
    });

    return either.right(presentedResourceLinks);
  }
}
