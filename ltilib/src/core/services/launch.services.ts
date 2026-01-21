import { either as e, taskEither as te } from "fp-ts";
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
import { LtiResourceLink } from "../resource-link";

type GetLaunchLinksParams = {
  userRoles: AnyLtiRole[];
};

type GetLaunchLinksFromResourceLinksParams = GetLaunchLinksParams & {
  resourceLinks: LtiResourceLink[];
};

type PresentLaunchLinksParams = {
  resourceLinks: LtiResourceLink[];
  toolsResourceLinkMessages: Map<string, ToolSupportedMessage>;
};

type GetLaunchLinksFromContext = GetLaunchLinksParams & {
  contextId: string;
};

export class LtiLaunchServices<ExternalError> {
  public constructor(
    private resourceLinksRepository: LtiResourceLinksRepository<ExternalError>,
    private ltiToolsRepository: LtiToolsRepository<ExternalError>,
    private platform: Platform,
  ) {}

  public async getLaunchLinksFromResourceLinks({
    resourceLinks,
    userRoles,
  }: GetLaunchLinksFromResourceLinksParams): Promise<
    Either<ExternalError, PresentedLtiResourceLink[]>
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

  public async getLaunchLinksFromContext({
    userRoles,
    contextId,
  }: GetLaunchLinksFromContext) {
    return await pipe(
      promiseToTaskEither(() =>
        this.resourceLinksRepository.findMany({ withContextId: contextId }),
      ),
      te.map((resourceLinks) =>
        promiseToTaskEither(() =>
          this.getLaunchLinksFromResourceLinks({ resourceLinks, userRoles }),
        ),
      ),
      te.flattenW,
    )();
  }

  public async getLaunchLinks({
    userRoles,
  }: GetLaunchLinksParams): Promise<
    Either<ExternalError, PresentedLtiResourceLink[]>
  > {
    return await pipe(
      promiseToTaskEither(() => this.resourceLinksRepository.findMany()),
      te.map((resourceLinks) =>
        promiseToTaskEither(() =>
          this.getLaunchLinksFromResourceLinks({ resourceLinks, userRoles }),
        ),
      ),
      te.flattenW,
    )();
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
