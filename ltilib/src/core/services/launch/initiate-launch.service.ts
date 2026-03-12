import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { MessageType } from "$/claims/serialization";
import { InvalidLaunchInitiationError } from "$/core/errors/invalid-launch-initiation.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiLaunchData } from "$/core/launch-data";
import { MessageRequests } from "$/core/messages";
import { InitiateLaunchRequest } from "$/core/messages/initiate-launch";
import { Platform } from "$/core/platform";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";

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

    const launch = LtiLaunchData.create({
      resourceLinkId: resourceLink.id,
      userId: sessionUserId,
      presentation,
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
      targetLink: this.resolveTargetLinkUrl(tool, resourceLink),
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
