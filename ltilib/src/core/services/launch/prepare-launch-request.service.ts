import { either as e, option as o, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { AssignmentAndGradeServiceClaim } from "$/assignment-and-grade/claim";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim";
import { Context } from "$/core/context";
import { AuthenticationRedirectionError } from "$/core/errors/authentication-redirection.error";
import { CouldNotFindToolDueToExternalRepositoryError } from "$/core/errors/could-not-find-tool-due-to-external-error";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { InvalidResourceLinkLaunchError } from "$/core/errors/invalid-resource-link-launch.error";
import { MalformedRequestError } from "$/core/errors/malformed-request.error";
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
  context?: Context;
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
    private agsClaimServices: LtiAgsClaimServices | undefined,
    private userIdentitiesRepository: LtiUserIdentitiesRespository,
    private toolsRepository: LtiToolsRepository,
  ) {}

  public async execute({
    loginHint,
    messageHint,
    nonce,
    redirectUri: _redirectUri,
    state,
    userIdentity,
    context,
    fallbackUserRoles,
    errorDescriptionsRoutes,
    toolId,
    transformLaunchRequest,
    ...otherParametersToValidate
  }: AuthenticateLaunchLoginRequestParams<CustomRoles, CustomContextType>): Promise<
    Either<
      | AuthenticationRedirectionError
      | InvalidResourceLinkLaunchError
      | InvalidRedirectUriError
      | CouldNotFindToolDueToExternalRepositoryError
      | MalformedRequestError,
      LTIResourceLinkLaunchRequest<CustomRoles, CustomContextType>
    >
  > {
    const requestIsValid = validateAuthenticationRequest(otherParametersToValidate);
    if (e.isLeft(requestIsValid)) return requestIsValid;

    const toolResult = await this.toolsRepository.findToolById(toolId);

    if (e.isLeft(toolResult)) {
      if (toolResult.left.type === "ExternalError") {
        return e.left(new CouldNotFindToolDueToExternalRepositoryError(toolResult.left));
      }

      const error = new InvalidRedirectUriError(
        "Tool is not registered and thus given redirect URI is not reliable.",
        _redirectUri,
      );
      return e.left(error);
    }

    const tool = toolResult.right;

    const redirectUriIsValid = this.verifyRedirectUri(_redirectUri, tool);
    if (e.isLeft(redirectUriIsValid)) return redirectUriIsValid;
    const redirectUri = redirectUriIsValid.right;

    if (loginHint !== messageHint) {
      const invalidRequestError = new AuthenticationRedirectionError({
        code: "invalid_request",
        description: "Initiated launch is malformed.",
        errorPageUri: errorDescriptionsRoutes?.malformedLaunch,
        redirectUri,
        state,
      });

      return e.left(invalidRequestError);
    }

    const launchAndLink = await pipe(
      () => this.launchesRepository.findById(messageHint),
      te.mapLeft((error) => {
        if (error.type === "ExternalError") return error;
        return new AuthenticationRedirectionError({
          code: "invalid_request",
          description: "Launch is invalid or might be expired.",
          errorPageUri: errorDescriptionsRoutes?.invalidRequest,
          redirectUri,
          state,
        });
      }),
      te.chainW((launch) =>
        pipe(
          () => {
            const linkId = launch.resourceLinkId.toString();
            return this.resourceLinksRepository.findById(linkId);
          },
          te.mapLeft((error) => {
            if (error.type === "ExternalError") return error;
            return new AuthenticationRedirectionError({
              code: "invalid_request",
              description: "The resource does not exist or could not be found.",
              errorPageUri: errorDescriptionsRoutes?.linkNotFound,
              redirectUri,
              state,
            });
          }),
          te.map((resourceLink) => ({ launch, resourceLink })),
        ),
      ),
      te.mapLeft((error) => {
        if (error instanceof AuthenticationRedirectionError) return error;
        return new AuthenticationRedirectionError({
          code: "server_error",
          description: "Something went wrong while retrieving the launch data.",
          errorPageUri: errorDescriptionsRoutes?.serverError,
          redirectUri,
          state,
        });
      }),
    )();

    const serverErrorFactory: RedirectionErrorFactory = (
      code: AuthenticationRedirectionError["code"],
      description: string,
      page: ErrorKey,
    ) =>
      new AuthenticationRedirectionError({
        code,
        description,
        errorPageUri: errorDescriptionsRoutes?.[page],
        redirectUri,
        state,
      });

    if (e.isLeft(launchAndLink)) return launchAndLink;

    const { launch, resourceLink } = launchAndLink.right;

    return await pipe(
      te.Do,
      te.apSW(
        "agsClaim",
        this.prepareAgsClaimIfEnabled(tool, context, resourceLink, serverErrorFactory),
      ),
      te.apSW("userIdentity", () =>
        this.resolveUserIdentity(launch, userIdentity, serverErrorFactory),
      ),
      te.chainW(({ agsClaim, userIdentity }) =>
        pipe(
          LTIResourceLinkLaunchRequest.create<CustomRoles, CustomContextType>({
            tool,
            nonce,
            platform: this.platform,
            resourceLink,
            state,
            userIdentity,
            context,
            userRoles: fallbackUserRoles,
            agsClaim,
            resolvedTargetLinkUrl: launch.targetLinkUrl,
          }),
          te.fromEither,
        ),
      ),
      te.map((launchRequest) => {
        if (launch.presentation) launchRequest.setPresentation(launch.presentation);
        transformLaunchRequest?.(launchRequest);
        return launchRequest;
      }),
    )();
  }

  private prepareAgsClaimIfEnabled(
    tool: LtiTool,
    context: Context | undefined,
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
  private verifyRedirectUri(redirectUri: string, tool: LtiTool) {
    if (!tool.redirectUrls.includes(redirectUri)) {
      return e.left(
        new InvalidRedirectUriError("Given redirect URI is not registered.", redirectUri),
      );
    }

    return pipe(
      e.tryCatch(
        () => new URL(redirectUri),
        (_error) => new InvalidRedirectUriError("Given redirect URI is not valid.", redirectUri),
      ),
    );
  }

  private async resolveUserIdentity(
    launch: LtiLaunchData,
    userIdentity: UserIdentity | undefined,
    errFactory: RedirectionErrorFactory,
  ): Promise<Either<AuthenticationRedirectionError, UserIdentity>> {
    if (userIdentity && launch.userId !== userIdentity.id) {
      const loginRequiredRedirection = errFactory(
        "login_required",
        "The user who started the launch is not the current user.",
        "loginRequired",
      );

      return e.left(loginRequiredRedirection);
    } else if (userIdentity) return e.right(userIdentity);

    const userIdentityResult = await this.userIdentitiesRepository.findUserIdentityById(
      launch.userId,
    );

    if (e.isRight(userIdentityResult)) return userIdentityResult;

    if (userIdentityResult.left.type === "NotFound") {
      const loginRequiredRedirection = errFactory(
        "login_required",
        "There's no authenticated user attached to this launch.",
        "loginRequired",
      );

      return e.left(loginRequiredRedirection);
    }

    const error = errFactory(
      "server_error",
      "Something went wrong while retrieving user identity.",
      "serverError",
    );

    return e.left(error);
  }
}
