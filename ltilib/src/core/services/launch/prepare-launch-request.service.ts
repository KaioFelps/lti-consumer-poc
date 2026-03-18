import { either as e, option as o, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { AssignmentAndGradeServiceClaim } from "$/assignment-and-grade/claim";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim";
import { Context } from "$/core/context";
import { AuthenticationRedirectionError } from "$/core/errors/authentication-redirection.error";
import { CouldNotFindToolDueToExternalRepositoryError } from "$/core/errors/could-not-find-tool-due-to-external-error";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { LtiLaunchData } from "$/core/launch-data";
import { LTIResourceLinkLaunchRequest } from "$/core/messages/resource-link-launch";
import { Platform } from "$/core/platform";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiToolsRepository } from "$/core/repositories/tools.repository";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { UserIdentity, UserRoles } from "$/core/user-identity";
import {
  ValidateAuthenticationRequestArgs,
  validateAuthenticationRequest,
} from "$/security/validate-authentication-request";

type RedirectionErrorFactory = (
  code: AuthenticationRedirectionError["code"],
  description: string,
  page: ErrorKey,
) => AuthenticationRedirectionError;

type ErrorKey =
  | "invalidRequest"
  | "linkNotFound"
  | "malformedLaunch"
  | "loginRequired"
  | "serverError";

export type LaunchAuthErrorDescriptionsRoutes = { [key in ErrorKey]?: URL };

export type AuthenticateLaunchLoginRequestParams<CustomRoles extends string, CustomContextType> = {
  nonce: string;
  toolId: LtiTool["id"];
  redirectUri: string;
  state: string;
  loginHint: string;
  messageHint: string;
  /**
   * If an instance of `UserIdentity` of the same user who initiated the launch is already available,
   * it can be used to authenticate the tool and prepare the launch request.
   *
   * If none is provided, the identity of the user who initiated the launch will be fetched and used.
   */
  userIdentity?: UserIdentity;
  context?: Context<CustomContextType>;
  fallbackUserRoles?: UserRoles<CustomRoles>;
  transformLaunchRequest?: (
    request: LTIResourceLinkLaunchRequest<CustomRoles, CustomContextType>,
  ) => void;
  /**
   * A map of errors and URI of web pages that contains information about it.
   *
   * @see {@link https://openid.net/specs/openid-connect-core-1_0.html#AuthError}
   */
  errorDescriptionsRoutes?: LaunchAuthErrorDescriptionsRoutes;
} & ValidateAuthenticationRequestArgs;

export class PrepareLaunchRequestService<
  CustomRoles extends string = never,
  CustomContextType = never,
> {
  public constructor(
    private platform: Platform,
    private resourceLinksRepository: LtiResourceLinksRepository,
    private launchesRepository: LtiLaunchesRepository,
    private agsClaimServices: LtiAgsClaimServices<CustomContextType> | undefined,
    private userIdentitiesRepository: LtiUserIdentitiesRespository<CustomRoles>,
    private toolsRepository: LtiToolsRepository,
  ) {}

  public async execute({
    loginHint,
    messageHint,
    nonce,
    redirectUri: unsafeRedirectUri,
    state,
    userIdentity: incominguseridentity,
    context,
    fallbackUserRoles,
    errorDescriptionsRoutes,
    toolId,
    transformLaunchRequest,
    ...otherParametersToValidate
  }: AuthenticateLaunchLoginRequestParams<CustomRoles, CustomContextType>) {
    return await pipe(
      te.Do,
      te.chainFirstEitherKW(() => validateAuthenticationRequest(otherParametersToValidate)),
      te.bindW("tool", () => this.findTool(toolId, unsafeRedirectUri)),
      te.bindW("redirectUri", ({ tool }) => this.verifyRedirectUri(tool, unsafeRedirectUri)),
      te.bindW("failRedirect", ({ redirectUri }) =>
        this.generateRedirectErrorFactory(errorDescriptionsRoutes, redirectUri, state),
      ),
      te.chainFirstW(({ failRedirect }) =>
        this.ensureLtilibLaunch(loginHint, messageHint, failRedirect),
      ),
      te.bindW("launch", ({ failRedirect }) => this.findLaunchData(messageHint, failRedirect)),
      te.bindW("resourceLink", ({ launch, failRedirect }) =>
        this.findResourceLink(launch, failRedirect),
      ),
      te.bindW("userIdentity", ({ launch, failRedirect }) =>
        this.resolveUserIdentity(launch, incominguseridentity, failRedirect),
      ),
      te.bindW("agsClaim", ({ tool, resourceLink, failRedirect }) =>
        this.prepareAgsClaimIfEnabled(tool, context, resourceLink, failRedirect),
      ),
      te.bindW("launchMessage", ({ tool, resourceLink, agsClaim, launch, userIdentity }) =>
        this.prepareMessage(
          tool,
          resourceLink,
          launch,
          agsClaim,
          nonce,
          state,
          userIdentity,
          context,
          fallbackUserRoles,
        ),
      ),
      te.chainFirstIOK(({ launchMessage, launch }) => () => {
        if (launch.presentation) launchMessage.setPresentation(launch.presentation);
        transformLaunchRequest?.(launchMessage);
      }),
      te.bindW(
        "form",
        ({ launchMessage }) =>
          () =>
            launchMessage.intoForm(),
      ),
      te.map(({ form, launchMessage }) => {
        const headers = { "Content-Type": "text/html" };
        return new HttpResponseWrapper<typeof launchMessage, string>(
          form,
          200,
          launchMessage,
          headers,
        );
      }),
    )();
  }

  private prepareAgsClaimIfEnabled(
    tool: LtiTool,
    context: Context<CustomContextType> | undefined,
    resourceLink: LtiResourceLink,
    errFactory: RedirectionErrorFactory,
  ): TaskEither<AuthenticationRedirectionError, AssignmentAndGradeServiceClaim | undefined> {
    return pipe(
      this.agsClaimServices
        ? () => this.agsClaimServices!.create({ tool, context, resourceLink })
        : te.right(o.none),
      te.map(o.toUndefined),
      te.mapLeft((_externalRepositoryError) =>
        errFactory(
          "server_error",
          "Something went wrong while mounting LTI AGS claim",
          "serverError",
        ),
      ),
    );
  }

  /**
   * Ensures the `redirectUri` is safe to redirect the current user to.
   * It **must** be the first verification to be made during an authentication flow,
   * since further errors are redirections to `redirectUri`.
   */
  private verifyRedirectUri(tool: LtiTool, unsafeRedirectUri: string) {
    if (!tool.redirectUrls.includes(unsafeRedirectUri)) {
      return te.left(
        new InvalidRedirectUriError("Given redirect URI is not registered.", unsafeRedirectUri),
      );
    }

    return pipe(
      e.tryCatch(
        () => new URL(unsafeRedirectUri),
        (_error) =>
          new InvalidRedirectUriError("Given redirect URI is not valid.", unsafeRedirectUri),
      ),
      te.fromEither,
    );
  }

  private resolveUserIdentity(
    launch: LtiLaunchData,
    userIdentity: UserIdentity<CustomRoles> | undefined,
    errFactory: RedirectionErrorFactory,
  ): TaskEither<AuthenticationRedirectionError, UserIdentity<CustomRoles>> {
    const userIdentityExistsButIsInconsistent = !!userIdentity && launch.userId !== userIdentity.id;

    if (userIdentityExistsButIsInconsistent) {
      const loginRequiredRedirection = errFactory(
        "login_required",
        "The user who started the launch is not the current user.",
        "loginRequired",
      );

      return te.left(loginRequiredRedirection);
    }

    if (userIdentity) return te.right(userIdentity);

    return pipe(
      () => this.userIdentitiesRepository.findUserIdentityById(launch.userId),
      te.mapLeft((error) => {
        if (error.type === "NotFound") {
          return errFactory(
            "login_required",
            "There's no authenticated user attached to this launch.",
            "loginRequired",
          );
        }

        return errFactory(
          "server_error",
          "Something went wrong while retrieving user identity.",
          "serverError",
        );
      }),
    );
  }

  private findTool(toolId: string, unsafeRedirectUri: string) {
    return pipe(
      () => this.toolsRepository.findToolById(toolId),
      te.mapLeft((error) => {
        if (error.type === "ExternalError") {
          return new CouldNotFindToolDueToExternalRepositoryError(error);
        }

        return new InvalidRedirectUriError(
          "Tool is not registered and thus given redirect URI is not reliable.",
          unsafeRedirectUri,
        );
      }),
    );
  }

  private ensureLtilibLaunch(
    loginHint: string,
    messageHint: string,
    errFactory: RedirectionErrorFactory,
  ) {
    if (loginHint !== messageHint) {
      const invalidRequestError = errFactory(
        "invalid_request",
        "Initiated launch is malformed.",
        "malformedLaunch",
      );

      return te.left(invalidRequestError);
    }

    return te.right(undefined);
  }

  private generateRedirectErrorFactory(
    errorDescriptionsRoutes: LaunchAuthErrorDescriptionsRoutes | undefined,
    safeRedirectUri: URL,
    state: string,
  ) {
    const factory: RedirectionErrorFactory = (
      code: AuthenticationRedirectionError["code"],
      description: string,
      page: ErrorKey,
    ) =>
      new AuthenticationRedirectionError({
        code,
        description,
        errorPageUri: errorDescriptionsRoutes?.[page],
        redirectUri: safeRedirectUri,
        state,
      });

    return te.right(factory);
  }

  private findLaunchData(launchId: string, redirectionErrFactory: RedirectionErrorFactory) {
    return pipe(
      () => this.launchesRepository.findById(launchId),
      te.mapLeft((error) => {
        if (error.type === "ExternalError") {
          return redirectionErrFactory(
            "server_error",
            "Something went wrong while retrieving the launch data.",
            "serverError",
          );
        }

        return redirectionErrFactory(
          "invalid_request",
          "Launch is invalid or might be expired.",
          "invalidRequest",
        );
      }),
    );
  }

  private findResourceLink(launch: LtiLaunchData, failRedirect: RedirectionErrorFactory) {
    const linkId = launch.resourceLinkId.toString();
    return pipe(
      () => this.resourceLinksRepository.findById(linkId),
      te.mapLeft((error) => {
        if (error.type === "ExternalError") {
          return failRedirect(
            "server_error",
            "Something went wrong while retrieving the resource link being launched.",
            "serverError",
          );
        }

        return failRedirect(
          "invalid_request",
          "The resource does not exist or could not be found.",
          "linkNotFound",
        );
      }),
    );
  }

  private prepareMessage(
    tool: LtiTool,
    resourceLink: LtiResourceLink,
    launch: LtiLaunchData,
    agsClaim: AssignmentAndGradeServiceClaim | undefined,
    nonce: string,
    state: string,
    userIdentity: UserIdentity<CustomRoles>,
    context: Context<CustomContextType> | undefined,
    fallbackUserRoles: UserRoles<CustomRoles> | undefined,
  ) {
    return pipe(
      LTIResourceLinkLaunchRequest.create<CustomRoles, CustomContextType>({
        tool,
        nonce,
        platform: this.platform,
        resourceLink,
        state,
        userIdentity,
        context,
        fallbackUserRoles,
        agsClaim,
        resolvedTargetLinkUrl: launch.targetLinkUrl,
      }),
      te.fromEither,
    );
  }
}
