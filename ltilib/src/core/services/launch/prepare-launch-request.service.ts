import { either as e, option as o, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim";
import { Context } from "$/core/context";
import { AuthenticationRedirectionError } from "$/core/errors/authentication-redirection.error";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { InvalidResourceLinkLaunchError } from "$/core/errors/invalid-resource-link-launch.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LTIResourceLinkLaunchRequest } from "$/core/messages/resource-link-launch";
import { Platform } from "$/core/platform";
import { LtiLaunchesRepository } from "$/core/repositories/launches.repository";
import { LtiResourceLinksRepository } from "$/core/repositories/resource-links.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { UserIdentity, UserRoles } from "$/core/user-identity";

export type AuthenticateLaunchLoginRequestParams<CustomRoles, CustomContextType> = {
  nonce: string;
  tool: LtiTool;
  redirectUri: string;
  state: string;
  loginHint: string;
  messageHint: string;
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
  errorDescriptionsRoutes?: Record<
    | "invalidRequest"
    | "linkNotFound"
    | "malformedLaunch"
    | "unauthorizedRedirectUri"
    | "serverError",
    URL
  >;
};

export class PrepareLaunchRequestService<
  CustomRoles extends string = never,
  CustomContextType = never,
> {
  public constructor(
    private platform: Platform,
    private resourceLinksRepository: LtiResourceLinksRepository,
    private launchesRepository: LtiLaunchesRepository,
    private agsClaimServices: LtiAgsClaimServices | undefined,
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
    tool,
    transformLaunchRequest,
  }: AuthenticateLaunchLoginRequestParams<CustomRoles, CustomContextType>): Promise<
    Either<
      | AuthenticationRedirectionError
      | LtiRepositoryError
      | InvalidResourceLinkLaunchError
      | InvalidRedirectUriError,
      LTIResourceLinkLaunchRequest<CustomRoles, CustomContextType>
    >
  > {
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

    if (e.isLeft(launchAndLink)) return launchAndLink;

    const { launch, resourceLink } = launchAndLink.right;

    let loginRequiredError: string | undefined;

    if (!userIdentity) {
      loginRequiredError = "There's no authenticated user attached to this launch.";
    }

    if (launch.userId !== userIdentity?.id) {
      loginRequiredError = "The user who started the launch is not the current user.";
    }

    if (loginRequiredError) {
      const loginRequiredRedirection = new AuthenticationRedirectionError({
        code: "login_required",
        errorPageUri: errorDescriptionsRoutes?.unauthorizedRedirectUri,
        description: loginRequiredError,
        redirectUri,
        state,
      });

      return e.left(loginRequiredRedirection);
    }

    return await pipe(
      this.prepareAgsClaimIfEnabled(tool, context, resourceLink),
      te.chainW((agsClaim) =>
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
  ) {
    return pipe(
      this.agsClaimServices
        ? () => this.agsClaimServices!.create({ tool, context, resourceLink })
        : te.right(o.none),
      te.map(o.toUndefined),
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
}
