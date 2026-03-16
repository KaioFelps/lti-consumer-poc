import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim";
import { Platform } from "$/core/platform";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiToolsRepository } from "$/core/repositories/tools.repository";
import {
  GetLaunchLinksFromResourceLinksParams,
  GetLaunchLinksParams,
  GetLaunchLinksService,
} from "./get-launch-links.service";
import { InitiateLaunchParams, InitiateLaunchService } from "./initiate-launch.service";
import {
  AuthenticateLaunchLoginRequestParams,
  PrepareLaunchRequestService,
} from "./prepare-launch-request.service";

type GetLaunchLinksFromContext = GetLaunchLinksParams & {
  contextId: string;
};

export class LtiLaunchServices<CustomRoles = never, CustomContextType = never> {
  private prepareLaunchRequestService: PrepareLaunchRequestService<CustomRoles, CustomContextType>;
  private initiateLaunchService: InitiateLaunchService;
  private getLaunchLinksService: GetLaunchLinksService;

  public constructor(
    private resourceLinksRepository: LtiResourceLinksRepository,
    ltiToolsRepository: LtiToolsRepository,
    launchesRepository: LtiLaunchesRepository,
    platform: Platform,
    agsClaimServices: LtiAgsClaimServices | undefined,
  ) {
    this.prepareLaunchRequestService = new PrepareLaunchRequestService(
      platform,
      resourceLinksRepository,
      launchesRepository,
      agsClaimServices,
    );

    this.initiateLaunchService = new InitiateLaunchService(platform, launchesRepository);

    this.getLaunchLinksService = new GetLaunchLinksService(platform, ltiToolsRepository);
  }

  /**
   * Authenticates a LTI launch login request and prepare the launch message.
   */
  public async authenticateLaunch(
    args: AuthenticateLaunchLoginRequestParams<CustomRoles, CustomContextType>,
  ) {
    return await this.prepareLaunchRequestService.execute(args);
  }

  public async initiateLaunch<ExternalError = unknown>(args: InitiateLaunchParams) {
    return await this.initiateLaunchService.execute<ExternalError>(args);
  }

  public async getLaunchLinksFromResourceLinks(args: GetLaunchLinksFromResourceLinksParams) {
    return await this.getLaunchLinksService.execute(args);
  }

  public async getLaunchLinksFromContext({ userRoles, contextId }: GetLaunchLinksFromContext) {
    return await pipe(
      () => this.resourceLinksRepository.findMany({ withContextId: contextId }),
      te.chainW(
        (resourceLinks) => () => this.getLaunchLinksService.execute({ resourceLinks, userRoles }),
      ),
    )();
  }

  public async getLaunchLinks({ userRoles }: GetLaunchLinksParams) {
    return await pipe(
      () => this.resourceLinksRepository.findMany(),
      te.chain(
        (resourceLinks) => () => this.getLaunchLinksService.execute({ resourceLinks, userRoles }),
      ),
    )();
  }
}
