import { either as e, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { eitherPromiseToTaskEither as teFromPromise } from "@/lib/fp-ts";
import { AnyLtiRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { ToolRecord } from "$/registration/tool-record";
import { ToolSupportedMessage } from "$/registration/tool-supported-message";
import { Context } from "../context";
import { AuthenticationRedirectionError } from "../errors/authentication-redirection.error";
import { InvalidRedirectUriError } from "../errors/invalid-redirect-uri.error";
import { LtiRepositoryError } from "../errors/repository.error";
import { LtiLaunchData } from "../launch-data";
import { MessageRequests } from "../messages";
import { InitiateLaunchRequest } from "../messages/initiate-launch";
import { LTIResourceLinkLaunchRequest } from "../messages/resource-link-launch";
import { Platform } from "../platform";
import {
  type PresentedLtiResourceLink,
  presentLtiResourceLink,
} from "../presenters/resource-link.presenter";
import { LtiLaunchesRepository } from "../repositories/launches.repository";
import { LtiResourceLinksRepository } from "../repositories/resource-links.repository";
import { LtiToolsRepository } from "../repositories/tools.repository";
import { LtiResourceLink } from "../resource-link";
import { UserIdentity, UserRoles } from "../user-identity";

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

type InitiateLaunchParams = {
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

type AuthenticateLaunchLoginRequestParams<CustomRoles, CustomContextType> = {
  nonce: string;
  tool: ToolRecord;
  redirectUri: URL;
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

type VerifyRedirectUriParams = {
  redirectUri: string;
  tool: ToolRecord;
};

export class LtiLaunchServices<CustomRoles = never, CustomContextType = never> {
  public constructor(
    private resourceLinksRepository: LtiResourceLinksRepository,
    private ltiToolsRepository: LtiToolsRepository,
    private launchRepository: LtiLaunchesRepository,
    private platform: Platform,
  ) {}

  public async prepareLaunchInitiationRequest<ExternalError = unknown>({
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
    const saveResult = await this.launchRepository.save(launch, TEN_MINUTES);

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

  public async verifyRedirectUri({
    redirectUri,
    tool,
  }: VerifyRedirectUriParams): Promise<Either<InvalidRedirectUriError, URL>> {
    // must be the first verification because further errors are redirections to `redirect_uri`,
    // therefore we must ensure it's valid and we're safe to redirect users to it.
    if (!tool.uris.redirect.includes(redirectUri)) {
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

  public async prepareLaunchRequest({
    loginHint,
    messageHint,
    nonce,
    redirectUri,
    state,
    userIdentity,
    context,
    fallbackUserRoles,
    errorDescriptionsRoutes,
    tool,
    transformLaunchRequest,
  }: AuthenticateLaunchLoginRequestParams<CustomRoles, CustomContextType>): Promise<
    Either<
      AuthenticationRedirectionError,
      LTIResourceLinkLaunchRequest<CustomRoles, CustomContextType>
    >
  > {
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
      teFromPromise(() => this.launchRepository.findById(messageHint)),
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
          teFromPromise(() => {
            const linkId = launch.resourceLinkId.toString();
            return this.resourceLinksRepository.findById(linkId);
          }),
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

    const launchRequest = LTIResourceLinkLaunchRequest.create<CustomRoles, CustomContextType>({
      tool,
      nonce,
      platform: this.platform,
      resourceLink,
      state,
      userIdentity,
      context,
      userRoles: fallbackUserRoles,
    });

    if (launch.presentation) launchRequest.setPresentation(launch.presentation);
    transformLaunchRequest?.(launchRequest);

    return e.right(launchRequest);
  }

  public async getLaunchLinksFromResourceLinks({
    resourceLinks,
    userRoles,
  }: GetLaunchLinksFromResourceLinksParams): Promise<
    Either<LtiRepositoryError, PresentedLtiResourceLink[]>
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

  public async getLaunchLinksFromContext({ userRoles, contextId }: GetLaunchLinksFromContext) {
    return await pipe(
      teFromPromise(() => this.resourceLinksRepository.findMany({ withContextId: contextId })),
      te.chainW((resourceLinks) =>
        teFromPromise(() => this.getLaunchLinksFromResourceLinks({ resourceLinks, userRoles })),
      ),
    )();
  }

  public async getLaunchLinks({
    userRoles,
  }: GetLaunchLinksParams): Promise<Either<LtiRepositoryError, PresentedLtiResourceLink[]>> {
    return await pipe(
      teFromPromise(() => this.resourceLinksRepository.findMany()),
      te.chain((resourceLinks) =>
        teFromPromise(() => this.getLaunchLinksFromResourceLinks({ resourceLinks, userRoles })),
      ),
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
