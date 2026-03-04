import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiLaunchData } from "$/core/launch-data";
import { MessageRequests } from "$/core/messages";
import { InitiateLaunchRequest } from "$/core/messages/initiate-launch";
import { Platform } from "$/core/platform";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { ToolRecord } from "$/registration/tool-record";

export type InitiateLaunchParams = {
  /**
   * The identifier of the user performing the resource link launch.
   * Will be used furthermore to authenticate the LTI Tool authorization request.
   */
  sessionUserId: string;
  resourceLink: LtiResourceLink;
  tool: ToolRecord;
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
    targetLinkUri,
  }: InitiateLaunchParams): Promise<
    Either<LtiRepositoryError<ExternalError>, InitiateLaunchRequest>
  > {
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
      targetLink: targetLinkUri ?? resourceLink.resource,
      loginHint: launch.id.toString(),
      ltiMessageHint: launch.id.toString(),
    });

    return e.right(launchInitiationRequest);
  }
}
