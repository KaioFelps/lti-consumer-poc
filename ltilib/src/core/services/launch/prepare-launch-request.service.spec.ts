/**
 * {@see {@link https://www.imsglobal.org/spec/lti/v1p3/#target-link-uri}}
 */

import { randomBytes } from "node:crypto";
import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { InMemoryLaunchesRepository } from "ltilib/tests/common/in-memory-repositories/launches.repository";
import { InMemoryLtiResourceLinksRepository } from "ltilib/tests/common/in-memory-repositories/resource-links.repository";
import { InMemoryToolsRepository } from "ltilib/tests/common/in-memory-repositories/tools.repository";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { LtiLaunchData } from "$/core/launch-data";
import { InitiateLaunchRequest } from "$/core/messages/initiate-launch";
import { Platform } from "$/core/platform";
import { LtiTool } from "$/core/tool";
import { UserIdentity } from "$/core/user-identity";
import { LtiLaunchServices } from ".";

describe("[Core] Prepare Launch Request Service", async () => {
  const TARGET_LINK_URI_CLAIM = "https://purl.imsglobal.org/spec/lti/claim/target_link_uri";

  let resourceLinksRepo: InMemoryLtiResourceLinksRepository;
  let toolsRepo: InMemoryToolsRepository;
  let launchesRepo: InMemoryLaunchesRepository;

  let platform: Platform;
  let sut: LtiLaunchServices;

  beforeEach(async () => {
    resourceLinksRepo = new InMemoryLtiResourceLinksRepository();
    toolsRepo = new InMemoryToolsRepository();
    launchesRepo = new InMemoryLaunchesRepository();

    platform = await createPlatform();

    sut = new LtiLaunchServices(resourceLinksRepo, toolsRepo, launchesRepo, platform, undefined);
  });

  function getValidDataForInitiation() {
    const tool = createTool();
    const resourceLink = createResourceLink({ tool });
    const sessionUserId = generateUUID();

    toolsRepo.tools.push(tool);
    resourceLinksRepo.resourceLinks.push(resourceLink);

    return { tool, resourceLink, sessionUserId };
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
    sessionUserId,
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
      tool,
      userIdentity: UserIdentity.create<never>({ id: sessionUserId }),
      nonce: randomBytes(64).toString(),
      state: randomBytes(64).toString(),
      redirectUri: tool.redirectUrls[0],
    } as const;
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

  it("should not turn `redirect_uri` into a `URL` instance until registry verification has been done", async () => {
    const urlWithoutTrailingSlash = faker.internet.url({ protocol: "https", appendSlash: false });
    const tool = createTool({ redirectUrls: [urlWithoutTrailingSlash] });
    const resourceLink = createResourceLink({ tool });
    const sessionUserId = generateUUID();

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
    const claims = launchMessage.right.intoLtiClaim();

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

  // This means that the `redirect_uri` check must be the first check to be made within the launch service.
  it.skip("should never return any redirection error response when `redirect_uri` is not trusted", async () => {});

  it.skip("should require login hint to be the same value as message hint since this is how ltilib mounts the launch initiation", async () => {});

  it.skip("should refuse to perform the launch if there is no launch data stored and identified by login/message hint", async () => {});

  it.skip("should refuse to perform the launch if resource link does not exist", async () => {});

  it.skip("should treat server internal errors with a valid Open ID auth error", async () => {});

  it.skip("should refuse to perform the launch when there is no valid session user", async () => {});

  it.skip("should refuse to perform the launch when session user has changed during launch initiation and performance", async () => {});

  it.skip("should include presentation specified in the launch data as a LTI claim", async () => {});

  it.skip("should allow platforms to perform some transformation over launch request", async () => {});

  it.skip("should include context claim if context is given", async () => {});
});
