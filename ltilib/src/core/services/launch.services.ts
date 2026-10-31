import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim.services.js";
import { Platform } from "$/core/platform.js";
import { LtiContextsRepository } from "$/core/repositories/contexts.repository.js";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository.js";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository.js";
import { LtiToolsRepository } from "$/core/repositories/tools.repository.js";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository.js";
import {
  GetLaunchLinksFromResourceLinksParams,
  GetLaunchLinksParams,
  GetLaunchLinksService,
} from "./launch/get-launch-links.service.js";
import { InitiateLaunchParams, InitiateLaunchService } from "./launch/initiate-launch.service.js";
import {
  AuthenticateLaunchLoginRequestParams,
  PrepareLaunchRequestService,
} from "./launch/prepare-launch-request.service.js";

type GetLaunchLinksFromContext = GetLaunchLinksParams & {
  contextId: string;
};

export class LtiLaunchServices<CustomRoles extends string = never, CustomContextType = never> {
  private prepareLaunchRequestService: PrepareLaunchRequestService<CustomRoles, CustomContextType>;
  private initiateLaunchService: InitiateLaunchService;
  private getLaunchLinksService: GetLaunchLinksService;

  public constructor(
    private resourceLinksRepository: LtiResourceLinksRepository,
    ltiToolsRepository: LtiToolsRepository,
    launchesRepository: LtiLaunchesRepository,
    userIdentitiesRepository: LtiUserIdentitiesRespository,
    platform: Platform,
    agsClaimServices: LtiAgsClaimServices | undefined,
    contextsRepository: LtiContextsRepository<CustomContextType>,
  ) {
    this.prepareLaunchRequestService = new PrepareLaunchRequestService<
      CustomRoles,
      CustomContextType
    >(
      platform,
      resourceLinksRepository,
      launchesRepository,
      agsClaimServices,
      userIdentitiesRepository,
      ltiToolsRepository,
      contextsRepository,
    );

    this.initiateLaunchService = new InitiateLaunchService(platform, launchesRepository);

    this.getLaunchLinksService = new GetLaunchLinksService(platform, ltiToolsRepository);
  }

  /**
   * Authenticates an LTI launch login request and prepare the launch message.
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
