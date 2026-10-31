import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { MessageType } from "$/core/claims/serialization.js";
import { InvalidLaunchInitiationError } from "$/core/errors/invalid-launch-initiation.error.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiLaunchData } from "$/core/launch-data.js";
import { InitiateLaunchRequest } from "$/core/messages/initiate-launch.js";
import { MessageRequests } from "$/core/messages.js";
import { Platform } from "$/core/platform.js";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository.js";
import { LtiResourceLink } from "$/core/resource-link.js";
import { LtiTool } from "$/core/tool.js";

export type InitiateLaunchParams = {
  /**
   * The identifier of the user performing the resource link launch.
   * Will be used furthermore to authenticate the LTI Tool authorization request.
   */
  sessionUserId: string;
  resourceLink: LtiResourceLink;
  tool: LtiTool;
  /**
   * Indicates how to present this resource link launch.
   */
  presentation?: MessageRequests.Presentation;
  /**
   * If present, overrides `resourceLink.resource` URL.
   */
  targetLinkUri?: URL;
};

export class InitiateLaunchService {
  public constructor(
    private platform: Platform,
    private launchesRepository: LtiLaunchesRepository,
  ) {}

  public async execute<ExternalError>({
    resourceLink,
    tool,
    sessionUserId,
    presentation,
  }: InitiateLaunchParams): Promise<
    Either<LtiRepositoryError<ExternalError> | InvalidLaunchInitiationError, InitiateLaunchRequest>
  > {
    if (resourceLink.toolId !== tool.id) {
      return e.left(new InvalidLaunchInitiationError("resource_link_does_not_belong_to_tool"));
    }

    if (!tool.deploymentsIds.includes(resourceLink.deploymentId)) {
      return e.left(new InvalidLaunchInitiationError("resource_link_is_not_in_tools_deployments"));
    }

    const resolvedTargetLinkUrl = this.resolveTargetLinkUrl(tool, resourceLink);

    const launch = LtiLaunchData.create({
      resourceLinkId: resourceLink.id,
      userId: sessionUserId,
      presentation,
      targetLinkUrl: resolvedTargetLinkUrl,
    });

    const TEN_MINUTES = 600;
    const saveResult = await this.launchesRepository.save(launch, TEN_MINUTES);

    if (e.isLeft(saveResult)) {
      return saveResult as e.Left<LtiRepositoryError<ExternalError>>;
    }

    const launchInitiationRequest = InitiateLaunchRequest.create({
      platform: this.platform,
      tool,
      deploymentId: resourceLink.deploymentId,
      targetLink: resolvedTargetLinkUrl,
      loginHint: launch.id.toString(),
      ltiMessageHint: launch.id.toString(),
    });

    return e.right(launchInitiationRequest);
  }

  private resolveTargetLinkUrl(tool: LtiTool, resourceLink: LtiResourceLink) {
    const resourceLinkMessageSchema = tool.messages.find(
      (msg) => msg.type === MessageType.resourceLink,
    );

    return (
      resourceLink.resourceUrl ?? resourceLinkMessageSchema?.targetLinkUri ?? tool.targetLinkUri
    );
  }
}
