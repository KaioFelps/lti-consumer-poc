/**
 * {@see {@link https://www.imsglobal.org/spec/lti/v1p3/#target-link-uri}}
 */

import { randomBytes } from "node:crypto";
import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { JSDOM, VirtualConsole } from "jsdom";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { InMemoryLaunchesRepository } from "ltilib/tests/common/in-memory-repositories/launches.repository";
import { InMemoryLtiResourceLinksRepository } from "ltilib/tests/common/in-memory-repositories/resource-links.repository";
import { InMemoryToolsRepository } from "ltilib/tests/common/in-memory-repositories/tools.repository";
import { InMemoryUserIdentitiesRepository } from "ltilib/tests/common/in-memory-repositories/user-identities.repository";
import { InstitutionRole, MembershipRole } from "$/claims/enums/roles";
import { AuthenticationRedirectionError } from "$/core/errors/authentication-redirection.error";
import { CouldNotFindToolDueToExternalRepositoryError } from "$/core/errors/could-not-find-tool-due-to-external-error";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiLaunchData } from "$/core/launch-data";
import { MessageRequests } from "$/core/messages";
import { InitiateLaunchRequest } from "$/core/messages/initiate-launch";
import { LTIResourceLinkLaunchRequest } from "$/core/messages/resource-link-launch";
import { Platform } from "$/core/platform";
import { FindManyParams } from "$/core/repositories/resource-links.repository";
import { LtiToolsRepository } from "$/core/repositories/tools.repository";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { UserIdentity, UserRoles } from "$/core/user-identity";
import * as validateRequestFn from "$/security/validate-authentication-request";
import { LtiLaunchServices } from ".";
import {
  AuthenticateLaunchLoginRequestParams,
  LaunchAuthErrorDescriptionsRoutes,
} from "./prepare-launch-request.service";

describe("[Core] Prepare Launch Request Service", async () => {
  const TARGET_LINK_URI_CLAIM = "https://purl.imsglobal.org/spec/lti/claim/target_link_uri";
  const PRESENTATION_CLAIM = "https://purl.imsglobal.org/spec/lti/claim/launch_presentation";
  const CONTEXT_CLAIM = "https://purl.imsglobal.org/spec/lti/claim/context";
  const ROLES_CLAIM = "https://purl.imsglobal.org/spec/lti/claim/roles";

  let resourceLinksRepo: InMemoryLtiResourceLinksRepository;
  let toolsRepo: InMemoryToolsRepository;
  let launchesRepo: InMemoryLaunchesRepository;
  let userIdentitiesRepo: InMemoryUserIdentitiesRepository;

  let platform: Platform;
  let sut: LtiLaunchServices;

  beforeEach(async () => {
    resourceLinksRepo = new InMemoryLtiResourceLinksRepository();
    toolsRepo = new InMemoryToolsRepository();
    userIdentitiesRepo = new InMemoryUserIdentitiesRepository();
    launchesRepo = new InMemoryLaunchesRepository();

    platform = await createPlatform();

    sut = new LtiLaunchServices(
      resourceLinksRepo,
      toolsRepo,
      launchesRepo,
      userIdentitiesRepo,
      platform,
      undefined,
    );
  });

  function getValidDataForInitiation() {
    const tool = createTool();
    const resourceLink = createResourceLink({ tool });
    const sessionUserId = generateUUID();
    const userIdentity = UserIdentity.create({ id: sessionUserId });

    toolsRepo.tools.push(tool);
    resourceLinksRepo.resourceLinks.push(resourceLink);
    userIdentitiesRepo.users.push(userIdentity);

    return { tool, resourceLink, sessionUserId, userIdentity };
  }

  /**
   * A helper function that asserts initiation is successful (since this isn't the subject of these tests)
   * and extract those parameters that might be useful for testing the launch request.
   */
  function extractParametersFromInitiationMessage(
    initiationResult: Either<unknown, InitiateLaunchRequest>,
  ) {
    assert(e.isRight(initiationResult), "initiation should be successful to use this function");
    const initiation = initiationResult.right.intoUrl();

    const messageHint = initiation.searchParams.get("lti_message_hint");
    const deploymentId = initiation.searchParams.get("lti_deployment_id");
    const clientId = initiation.searchParams.get("client_id")!;
    const platformIssuer = initiation.searchParams.get("iss")!;
    const loginHint = initiation.searchParams.get("login_hint")!;
    const targetLink = initiation.searchParams.get("target_link_uri")!;

    assert(messageHint, "ltilib expects `lti_message_hint` never to be nullish");

    return {
      messageHint,
      deploymentId,
      clientId,
      platformIssuer,
      loginHint,
      targetLink,
    } as const;
  }

  function getValidDataForLaunch({
    loginHint,
    messageHint,
    tool,
  }: {
    loginHint: string;
    messageHint: string;
    tool: LtiTool;
    sessionUserId: string;
  }) {
    return {
      loginHint,
      messageHint,
      toolId: tool.id,
      nonce: randomBytes(64).toString(),
      state: randomBytes(64).toString(),
      redirectUri: tool.redirectUrls[0],
      prompt: "none",
      response_mode: "form_post",
      response_type: "id_token",
      scope: "openid",
    } satisfies AuthenticateLaunchLoginRequestParams<never, never>;
  }

  function replaceLaunches(
    launchesRepo: InMemoryLaunchesRepository,
    old: InMemoryLaunchesRepository["launches"][number],
    incoming: LtiLaunchData,
  ) {
    launchesRepo.launches = launchesRepo.launches.filter(
      (persistedLaunch) => persistedLaunch.data.id !== old.data.id,
    );

    launchesRepo.launches.push({
      data: incoming,
      savedAt: old.savedAt,
      ttl: old.ttl,
    });
  }

  it(
    `should specifically return a ${CouldNotFindToolDueToExternalRepositoryError.name} when tool ` +
      "could not be found due to external repository error and thus `resource_uri` could not be checked",
    async () => {
      class PoisonedToolsRepo implements LtiToolsRepository {
        public async findToolsOwningResourceLinks(
          _resourceLinksIds: LtiResourceLink["id"][],
        ): Promise<Either<LtiRepositoryError, LtiTool[]>> {
          return e.left(new LtiRepositoryError({ type: "ExternalError", cause: undefined }));
        }
        public async findToolById(_id: string): Promise<Either<LtiRepositoryError, LtiTool>> {
          return e.left(new LtiRepositoryError({ type: "ExternalError", cause: undefined }));
        }
      }

      const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
      const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });
      const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);

      sut = new LtiLaunchServices(
        resourceLinksRepo,
        new PoisonedToolsRepo(),
        launchesRepo,
        userIdentitiesRepo,
        platform,
        undefined,
      );

      const launch = await sut.authenticateLaunch(
        getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool }),
      );

      assert(
        e.isLeft(launch),
        "it should not be a successful launch since tools repository is poisoned",
      );

      expect(launch.left).toBeInstanceOf(CouldNotFindToolDueToExternalRepositoryError);
    },
  );

  it("should not turn `redirect_uri` into a `URL` instance until registry verification has been done", async () => {
    const urlWithoutTrailingSlash = faker.internet.url({ protocol: "https", appendSlash: false });
    const tool = createTool({ redirectUrls: [urlWithoutTrailingSlash] });
    const resourceLink = createResourceLink({ tool });
    const sessionUserId = generateUUID();

    userIdentitiesRepo.users.push(UserIdentity.create({ id: sessionUserId }));
    resourceLinksRepo.resourceLinks.push(resourceLink);
    toolsRepo.tools.push(tool);

    const initiation = await sut.initiateLaunch({ resourceLink, tool, sessionUserId });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);

    const launch = await sut.authenticateLaunch(
      getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool }),
    );

    assert(
      e.isRight(launch),
      "it should be valid since given URL is the same as registered in the platform. " +
        "If it's a failure it means it's been converted to URL and thus normalized before the " +
        "check occurred, and thus must be fixed",
    );
  });

  it("[5.3.4] should provide the exact same `targetLinkUri` as passed in the `InitiateLaunchRequest` message", async () => {
    const { tool, resourceLink, sessionUserId } = getValidDataForInitiation();

    const FAKE_TARGET_LINK = new URL("https://mocked.lti-tool.domain.foo/mocked-launch");

    const initiation = await sut.initiateLaunch({ resourceLink, tool, sessionUserId });
    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);

    // force launch data to have `FAKE_TARGET_LINK` persisted
    const oldLaunch = launchesRepo.launches.find((launch) => launch.data.id === messageHint)!;
    const newLaunch = LtiLaunchData.create({ ...oldLaunch.data, targetLinkUrl: FAKE_TARGET_LINK });
    replaceLaunches(launchesRepo, oldLaunch, newLaunch);

    const launchMessage = await sut.authenticateLaunch(
      getValidDataForLaunch({ tool, loginHint, messageHint, sessionUserId }),
    );

    assert(e.isRight(launchMessage), "it should've been a successful launch");
    const claims = launchMessage.right.rawContent.intoLtiClaim();

    expect(claims).toHaveProperty(TARGET_LINK_URI_CLAIM);
    expect(claims[TARGET_LINK_URI_CLAIM]).toBe(FAKE_TARGET_LINK.toString());
  });

  it("should refuse to perform the launch when the `redirect_uri` has not been previously registered within the tool record", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ tool, resourceLink, sessionUserId });
    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);

    // ensure this redirect url is not registered in the tool's record
    const UNREGISTERED_REDIRECT_URL = faker.internet.url({ protocol: "https" });
    tool.redirectUrls = tool.redirectUrls.filter((uri) => uri !== UNREGISTERED_REDIRECT_URL);

    const launch = await sut.authenticateLaunch({
      ...getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool }),
      redirectUri: UNREGISTERED_REDIRECT_URL,
    });

    assert(e.isLeft(launch));
    expect(launch.left).toBeInstanceOf(InvalidRedirectUriError);
  });

  /**
   * Recreates the service under testing (sut) with poisoned versions of relevant repositories.
   * These repositories will fail upon any method call with `LtiRepositoryError` of type "ExternalError".
   */
  const recreateSutWithPoisonedRepositories = () => {
    class FailingResourceLinksRepo extends InMemoryLtiResourceLinksRepository {
      public override async findMany(
        _params?: FindManyParams,
      ): Promise<Either<LtiRepositoryError, LtiResourceLink[]>> {
        const error = new LtiRepositoryError({
          type: "ExternalError",
          cause: "mocked error on finding many",
        });
        return e.left(error);
      }
      public override async findById(
        _resourceLinkId: string,
      ): Promise<Either<LtiRepositoryError, LtiResourceLink>> {
        const error = new LtiRepositoryError({
          type: "ExternalError",
          cause: "mocked error on finding by id",
        });
        return e.left(error);
      }
    }

    class FailingLaunchesRepo extends InMemoryLaunchesRepository {
      public override async save(
        _launch: LtiLaunchData,
        _timeToLiveSeconds: number,
      ): Promise<Either<LtiRepositoryError, void>> {
        const error = new LtiRepositoryError({
          type: "ExternalError",
          cause: "mocked error on saving",
        });
        return e.left(error);
      }
      public override async findById(
        _launchId: string,
      ): Promise<Either<LtiRepositoryError, LtiLaunchData>> {
        const error = new LtiRepositoryError({
          type: "ExternalError",
          cause: "mocked error on finding by id",
        });
        return e.left(error);
      }
    }

    const failingResourceLinksRepo = new FailingResourceLinksRepo();
    const failingLaunchesRepo = new FailingLaunchesRepo();
    sut = new LtiLaunchServices(
      failingResourceLinksRepo,
      toolsRepo,
      failingLaunchesRepo,
      userIdentitiesRepo,
      platform,
      undefined,
    );
  };

  const reverseString = (str: string) => {
    return str.split("").reverse().join("");
  };

  // This means that the `redirect_uri` check must be the first check to be made within the launch service,
  // having precedence over errors that might redirect the user to `redirect_uri`.
  it.each([
    { when: "login hint differs message hint", overrides: { loginHint: generateUUID() } },
    {
      when: "launch could not be found",
      overrides: {
        loginHint: "fake-and-unexisting-launch-id",
        messageHint: "fake-and-unexisting-launch-id",
      },
    },
    {
      when: "there is some external error raised by repositories",
      overrides: {},
      cb: recreateSutWithPoisonedRepositories,
    },
    {
      when: "launch data's session user ID differs from service's session user parameter",
      overrides: { userIdentity: UserIdentity.create<never>({ id: "fake-unexisting-user-id" }) },
    },
    { when: "no user identity was provided", overrides: { userIdentity: undefined } },
  ])(
    "should not return redirection error response when $when if `redirect_uri` is not trusted",
    async ({ overrides, cb }) => {
      const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
      const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

      const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
      const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

      // use an unregistered redirect url
      const UNREGISTERED_REDIRECT_URL = faker.internet.url({ protocol: "https" });
      tool.redirectUrls = tool.redirectUrls.filter((uri) => uri !== UNREGISTERED_REDIRECT_URL);

      cb?.();

      const launch = await sut.authenticateLaunch({
        ...parameters,
        ...overrides,
        redirectUri: UNREGISTERED_REDIRECT_URL,
      });

      assert(e.isLeft(launch));
      expect(launch.left).not.toBeInstanceOf(AuthenticationRedirectionError);
    },
  );

  it("should require login hint to be the same value as message hint since this is how ltilib mounts the launch initiation", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch({
      ...parameters,
      loginHint: reverseString(loginHint),
    });

    assert(e.isLeft(launch));
    expect(launch.left).toBeInstanceOf(AuthenticationRedirectionError);

    if (launch.left instanceof AuthenticationRedirectionError) {
      expect(launch.left.code).toBe("invalid_request");
    }
  });

  it("should refuse to perform the launch if there is no launch data stored and identified by login/message hint", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const unknownLaunchId = "fake-invalid-and-unexisting-launch-id";

    const launch = await sut.authenticateLaunch({
      ...parameters,
      loginHint: unknownLaunchId,
      messageHint: unknownLaunchId,
    });

    assert(e.isLeft(launch));
    expect(launch.left).toBeInstanceOf(AuthenticationRedirectionError);

    if (launch.left instanceof AuthenticationRedirectionError) {
      expect(launch.left.code).toBe("invalid_request");
    }
  });

  it("should refuse to perform the launch if resource link does not exist", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    // removes `resourceLink` from storage
    resourceLinksRepo.resourceLinks = resourceLinksRepo.resourceLinks.filter(
      (link) => link.id !== resourceLink.id,
    );

    const launch = await sut.authenticateLaunch(parameters);

    assert(e.isLeft(launch));
    expect(launch.left).toBeInstanceOf(AuthenticationRedirectionError);

    if (launch.left instanceof AuthenticationRedirectionError) {
      expect(launch.left.code).toBe("invalid_request");
    }
  });

  it("should treat server internal errors with a valid Open ID auth error", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    recreateSutWithPoisonedRepositories();

    const launch = await sut.authenticateLaunch(parameters);

    assert(e.isLeft(launch));
    expect(launch.left).toBeInstanceOf(AuthenticationRedirectionError);

    if (launch.left instanceof AuthenticationRedirectionError) {
      expect(launch.left.code).toBe("server_error");
    }
  });

  it("should refuse to perform the launch when there is no valid session user", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    // removes user
    userIdentitiesRepo.users = [];

    const launch = await sut.authenticateLaunch({
      ...parameters,
    });

    assert(e.isLeft(launch));
    expect(launch.left).toBeInstanceOf(AuthenticationRedirectionError);

    if (launch.left instanceof AuthenticationRedirectionError) {
      expect(launch.left.code).toBe("login_required");
    }
  });

  it("should fetch user identity when none is already provided", async () => {
    const repoCall = vi.spyOn(userIdentitiesRepo, "findUserIdentityById");

    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch({
      ...parameters,
      userIdentity: undefined,
    });

    assert(e.isRight(launch));
    expect(
      repoCall,
      "it should have tried to fetch user identity since none had been provided",
    ).toHaveBeenCalled();
  });

  it("should avoid to find user identity if the correct one has already been provided", async () => {
    const repoCall = vi.spyOn(userIdentitiesRepo, "findUserIdentityById");

    const { resourceLink, sessionUserId, tool, userIdentity } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch({
      ...parameters,
      userIdentity,
    });

    assert(e.isRight(launch));
    expect(
      repoCall,
      "it should not have tried to fetch user identity since it had already been provided",
    ).not.toHaveBeenCalled();
  });

  it("should refuse to perform the launch when session user has changed during launch initiation and performance", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch({
      ...parameters,
      userIdentity: UserIdentity.create({ id: "different-unknown-user-id" }),
    });

    assert(e.isLeft(launch));
    expect(launch.left).toBeInstanceOf(AuthenticationRedirectionError);

    if (launch.left instanceof AuthenticationRedirectionError) {
      expect(launch.left.code).toBe("login_required");
    }
  });

  it("should include presentation specified in the launch data as an LTI claim", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();

    const presentation = MessageRequests.Presentation.create({
      width: 100,
      height: 200,
      documentTarget: MessageRequests.DocumentTarget.Frame,
      locale: "pt-BR",
      returnUrl: new URL(faker.internet.url()),
    });

    const initiation = await sut.initiateLaunch({
      resourceLink,
      sessionUserId,
      tool,
      presentation,
    });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch(parameters);

    assert(e.isRight(launch));
    expect(launch.right.rawContent.intoLtiClaim()).toHaveProperty(PRESENTATION_CLAIM);
    expect(launch.right.rawContent.intoLtiClaim()[PRESENTATION_CLAIM]).toMatchObject(
      presentation.intoLtiClaim(),
    );
  });

  it("should not include presentation claim if no presentation has been specified", async () => {
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch(parameters);

    assert(e.isRight(launch));
    expect(launch.right.rawContent.intoLtiClaim()[PRESENTATION_CLAIM]).not.toBeDefined();
  });

  it("should include context claim if context is given and it contains the resource link", async () => {
    const customContext = createContext();

    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();

    resourceLink.contextId = customContext.id;

    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch(parameters);

    assert(e.isRight(launch));
    assert(e.isRight(launch.right.rawContent.setContext(customContext)));

    const claims = launch.right.rawContent.intoLtiClaim();
    expect(claims[CONTEXT_CLAIM]).toBeDefined();
    expect(claims[CONTEXT_CLAIM]).toMatchObject({
      id: customContext.id,
      label: customContext.label,
      title: customContext.title,
      type: customContext.type,
    });
  });

  it("should not set a context if the resource link being launched does not belong to it", async () => {
    const customContext = createContext();

    // ensure resource link is attached to no context at all
    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
    resourceLink.contextId = undefined;
    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch(parameters);

    assert(e.isRight(launch));
    assert(
      e.isLeft(launch.right.rawContent.setContext(customContext)),
      "it should not include context since the resource link does not belong to it",
    );
  });

  it("should allow platforms to perform some transformation over launch request", async () => {
    const customContext = createContext();
    const customMsg = "value assigned from within transformation";

    const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();

    resourceLink.contextId = customContext.id;

    const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

    const launch = await sut.authenticateLaunch({
      ...parameters,

      transformLaunchRequest: (request) => {
        request.customClaims["foo"] = customMsg;
        request.setContext(customContext);
      },
    });

    assert(e.isRight(launch));
    expect(launch.right.rawContent.customClaims["foo"]).toBe(customMsg);

    const claims = launch.right.rawContent.intoLtiClaim();
    expect(claims[CONTEXT_CLAIM]).toBeDefined();
    expect(claims[CONTEXT_CLAIM]).toMatchObject({
      id: customContext.id,
      label: customContext.label,
      title: customContext.title,
      type: customContext.type,
    });
  });

  it.each([
    {
      errorDescriptionKey: "malformedLaunch",
      error: "malformed request redirection",
      overrides: { loginHint: generateUUID() },
    },
    {
      errorDescriptionKey: "linkNotFound",
      error: "link not found",
      overrides: {},
      overrideLaunchResourceLinkId: "fake-and-unexisting-resource-link-id",
    },
    {
      errorDescriptionKey: "serverError",
      error: "server error redirection",
      overrides: {},
      cb: recreateSutWithPoisonedRepositories,
    },
    {
      errorDescriptionKey: "loginRequired",
      error: "login required redirection",
      overrides: { userIdentity: UserIdentity.create({ id: "fake-unexisting-user-id" }) },
    },
  ])(
    "should correctly include routes defined in `errorDescriptionsRoutes` in the error responses upon $error error",
    async ({ overrides, overrideLaunchResourceLinkId, errorDescriptionKey, cb }) => {
      const { resourceLink, sessionUserId, tool } = getValidDataForInitiation();
      const initiation = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

      const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
      const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });

      cb?.();

      if (overrideLaunchResourceLinkId) {
        const launch = launchesRepo.launches.find((launch) => launch.data.id === messageHint)!;

        const newLaunch = LtiLaunchData.create({
          ...launch.data,
          resourceLinkId: overrideLaunchResourceLinkId,
        });

        launchesRepo.launches = launchesRepo.launches.filter(
          (persistedLaunch) => persistedLaunch.data.id !== launch.data.id,
        );

        launchesRepo.launches.push({ data: newLaunch, savedAt: launch.savedAt, ttl: launch.ttl });
      }

      const errorDescriptionsRoutes = {
        invalidRequest: new URL("/invalid-lti-request", platform.issuer),
        linkNotFound: new URL("/lti-link-not-found", platform.issuer),
        malformedLaunch: new URL("/malformed-lti-launch", platform.issuer),
        serverError: new URL("/platform-server-error", platform.issuer),
        loginRequired: new URL("/login", platform.issuer),
      } satisfies LaunchAuthErrorDescriptionsRoutes;

      const launch = await sut.authenticateLaunch({
        ...parameters,
        ...overrides,
        errorDescriptionsRoutes,
      });

      const ERR_PAGE_URI_PROP = "errorPageUri";

      assert(e.isLeft(launch));
      expect(launch.left).toHaveProperty(ERR_PAGE_URI_PROP);
      expect(launch.left[ERR_PAGE_URI_PROP]).toBeDefined();

      const error = launch.left;

      expect(error[ERR_PAGE_URI_PROP]).toBe(errorDescriptionsRoutes[errorDescriptionKey]);
    },
  );

  it("should fallback to `fallbackUserRoles` when there are no roles in given `userIdentity`", async () => {
    const userIdentityWithoutRoles = UserIdentity.create<never>({ id: generateUUID(), roles: [] });
    const fallbackUserRoles = [MembershipRole.Learner, InstitutionRole.Learner] satisfies UserRoles;

    userIdentitiesRepo.users.push(userIdentityWithoutRoles);

    const { resourceLink, tool } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({
      resourceLink,
      sessionUserId: userIdentityWithoutRoles.id,
      tool,
    });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({
      loginHint,
      messageHint,
      sessionUserId: userIdentityWithoutRoles.id,
      tool,
    });

    const launch = await sut.authenticateLaunch({
      ...parameters,
      userIdentity: userIdentityWithoutRoles,
      fallbackUserRoles,
    });

    assert(e.isRight(launch));

    const claims = launch.right.rawContent.intoLtiClaim();
    expect(
      claims[ROLES_CLAIM],
      "it should have (only) the fallback user's roles set as value of the LTI roles claim",
    ).toEqual(expect.arrayContaining(fallbackUserRoles));
  });

  it("should use `validateAuthenticationRequest` policy", async () => {
    const validatePolicySpy = vi.spyOn(validateRequestFn, "validateAuthenticationRequest");

    const { resourceLink, tool, sessionUserId } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({
      resourceLink,
      sessionUserId,
      tool,
    });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });
    const launch = await sut.authenticateLaunch(parameters);

    assert(e.isRight(launch));
    expect(
      validatePolicySpy,
      "it should have validated the launch request as per LTI Security Framework specs",
    ).toHaveBeenCalledOnce();
  });

  it("should return a http response wrapper with the auto-submission form ready-to-go", async () => {
    const { resourceLink, tool, sessionUserId } = getValidDataForInitiation();
    const initiation = await sut.initiateLaunch({
      resourceLink,
      sessionUserId,
      tool,
    });

    const { loginHint, messageHint } = extractParametersFromInitiationMessage(initiation);
    const parameters = getValidDataForLaunch({ loginHint, messageHint, sessionUserId, tool });
    const launch = await sut.authenticateLaunch(parameters);

    assert(e.isRight(launch));

    expect(launch.right.httpStatusCode, "it should suggest 200 OK HTTP status code").toBe(200);
    expect(
      launch.right.headers.get("content-type"),
      "it should suggest 'text/html' content-type",
    ).toBe("text/html");
    expect(
      launch.right.rawContent,
      "it should provide the original resource link launch message",
    ).toBeInstanceOf(LTIResourceLinkLaunchRequest);

    const formHtml = launch.right.content;
    const getDomWithForm = () => new JSDOM(formHtml, { virtualConsole: new VirtualConsole() });

    expect(getDomWithForm).not.toThrow();
    const dom = getDomWithForm();
    const form = dom.window.document.querySelector("form");
    expect(form, "the response content should be the auto-submission form HTML").not.toBeNull();
  });
});
