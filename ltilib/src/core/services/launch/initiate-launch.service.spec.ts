import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { InMemoryLaunchesRepository } from "ltilib/tests/common/in-memory-repositories/launches.repository";
import { InMemoryLtiResourceLinksRepository } from "ltilib/tests/common/in-memory-repositories/resource-links.repository";
import { InMemoryToolsRepository } from "ltilib/tests/common/in-memory-repositories/tools.repository";
import { MessageType } from "$/claims/serialization";
import { InvalidLaunchInitiationError } from "$/core/errors/invalid-launch-initiation.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { MessageRequests } from "$/core/messages";
import { Platform } from "$/core/platform";
import { LtiTool } from "$/core/tool";
import { LtiLaunchServices } from ".";

const URL_ID_PARAM = "lti_message_hint";
const TARGET_LINK_PARAM = "target_link_uri";

describe("[Core] Initiate Launch Service", async () => {
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

  const getValidLaunchInitiationData = () => {
    const tool = createTool();
    const resourceLink = createResourceLink({ tool });
    const sessionUserId = generateUUID();

    resourceLinksRepo.resourceLinks.push(resourceLink);

    return { tool, resourceLink, sessionUserId };
  };

  // service ain't fetching the tool therefore it cannot check whether it already exists or no,
  // neither is it checking the deployment. this should be moved to inside of the service for better
  // encapsulation of these buziness logics
  it.skip("should not initiate a launch for a tool that has not been previously registered", async () => {
    const unpersistedTool = createTool();
    const resourceLink = createResourceLink();
    const sessionUserId = generateUUID();

    const result = await sut.initiateLaunch({
      resourceLink,
      tool: unpersistedTool,
      sessionUserId,
    });

    assert(e.isLeft(result));
    assert(result.left instanceof LtiRepositoryError);
    expect(result.left.type).toBe("NotFound");
  });

  it("should not initiate a launch for a tool that does not own the resource link being launched", async () => {
    const ownerTool = createTool();
    const clientTool = createTool();
    const resourceLink = createResourceLink({ tool: ownerTool });
    const sessionUserId = generateUUID();

    const result = await sut.initiateLaunch({
      resourceLink,
      sessionUserId,
      tool: clientTool,
    });

    assert(e.isLeft(result));
    assert(result.left instanceof InvalidLaunchInitiationError);
    expect(result.left.reason).toBe("resource_link_does_not_belong_to_tool");
  });

  it("should not initiate a launch for a tool that does not have deployments", async () => {
    const { resourceLink, tool, sessionUserId } = getValidLaunchInitiationData();

    // force resource link not to belong to any deployment from client LTI tool
    resourceLink.deploymentId = generateUUID();

    const result = await sut.initiateLaunch({
      resourceLink,
      sessionUserId,
      tool,
    });

    assert(
      e.isLeft(result),
      "it should not initiate a launch when the resource " +
        "link does not belong to any of tool's deployments",
    );

    assert(result.left instanceof InvalidLaunchInitiationError);
    expect(result.left.reason).toBe("resource_link_is_not_in_tools_deployments");

    expect(
      launchesRepo.launches.length,
      "it should not have stored any launch data since the launch has not been successfully initiated",
    ).toBe(0);
  });

  it("should ensure the resource link belongs to the tool before checking whether it also belongs to some of the tool's deployments", async () => {
    const sessionUserId = generateUUID();
    const toolWithCorrectDeployment = createTool({ deploymentsIds: [generateUUID()] });
    const clientTool = createTool();
    const resourceLink = createResourceLink({
      deploymentId: toolWithCorrectDeployment.deploymentsIds[0],
      tool: clientTool,
    });

    // the launch is trying to be made towards the tool with correct deployment, however,
    // the resource link does not belong to this tool, but to `clientTool`. Therefore,
    // it should fail
    const result = await sut.initiateLaunch({
      resourceLink,
      tool: toolWithCorrectDeployment,
      sessionUserId,
    });

    assert(
      e.isLeft(result),
      "it shoold not initiate a launch when both tool and deployments differ from those in the target resource link",
    );
    assert(result.left instanceof InvalidLaunchInitiationError);
    expect(result.left.reason).toBe("resource_link_does_not_belong_to_tool");
  });

  it("should put the launch data identifier as value of both login and message hint", async () => {
    const result = await sut.initiateLaunch(getValidLaunchInitiationData());

    assert(e.isRight(result));

    const redirectionUrl = result.right.intoUrl();

    const messageHint = redirectionUrl.searchParams.get("lti_message_hint");
    const loginHint = redirectionUrl.searchParams.get("login_hint");

    expect(
      messageHint,
      "launch initiation message should have the same value for both `lti_message_hint` and `lti_login_hint`",
    ).toEqual(loginHint);

    const theyAreLaunchIdentifier = launchesRepo.launches.some(
      (launch) => launch.data.id === messageHint,
    );

    expect(
      theyAreLaunchIdentifier,
      "any of `lti_message_hint` and `lti_login_hint` should be the identifier of a launch data",
    ).toBeTruthy();
  });

  it("should store resource link identifier for the next launch step", async () => {
    const { resourceLink, tool, sessionUserId } = getValidLaunchInitiationData();

    const result = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    assert(e.isRight(result));

    const message = result.right.intoUrl();
    const ltiMessageHint = message.searchParams.get("lti_message_hint");

    assert(
      ltiMessageHint !== null,
      "LTI Launch initiation URL to redirect must have a `lti_message_hint` search parameter",
    );

    const storedLaunchData = await launchesRepo.findById(ltiMessageHint);
    assert(
      e.isRight(storedLaunchData),
      "`lti_message_hint` should be the current launch data's identifier",
    );
  });

  it("should store the session user identifier for the next launch step", async () => {
    const { resourceLink, tool, sessionUserId } = getValidLaunchInitiationData();

    const result = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    assert(e.isRight(result));

    const launchId = result.right.intoUrl().searchParams.get(URL_ID_PARAM)!;
    const launchData = await launchesRepo.findById(launchId);
    assert(e.isRight(launchData));

    expect(launchData.right.userId).toBe(sessionUserId);
  });

  it("should store presentation data for the next launch step", async () => {
    const { resourceLink, sessionUserId, tool } = getValidLaunchInitiationData();

    const presentation = MessageRequests.Presentation.create({
      width: 100,
      height: 250,
      documentTarget: MessageRequests.DocumentTarget.Frame,
      locale: "pt-BR",
      returnUrl: new URL(platform.issuer),
    });

    const result = await sut.initiateLaunch({ resourceLink, sessionUserId, tool, presentation });

    assert(e.isRight(result));

    const launchId = result.right.intoUrl().searchParams.get(URL_ID_PARAM)!;
    const launch = launchesRepo.launches.find((launch) => launch.data.id === launchId);
    assert(launch);

    expect(launch.data).toHaveProperty("presentation");
    expect(launch.data.presentation).toMatchObject(presentation);
  });

  it.each(["target_link_uri", "targetLinkUri", "target_link_url", "targetLinkUrl"])(
    "should offer no manners of overriding `targetLinkUri` resolution",
    async (key) => {
      const FAKE_TARGET_LINK_URL = "https://impossible.example.url.foo.bar";
      const { resourceLink, sessionUserId, tool } = getValidLaunchInitiationData();

      const result = await sut.initiateLaunch({
        tool,
        resourceLink,
        sessionUserId,
        ...({ [key]: FAKE_TARGET_LINK_URL } as unknown as object), // force typescript to allow the injection of these unexpected parameters
      });

      assert(e.isRight(result), "it should actually initiate the launch");

      const initiationMessageTargetLinkUrl = result.right
        .intoUrl()
        .searchParams.get(TARGET_LINK_PARAM);

      expect(initiationMessageTargetLinkUrl).not.toBe(FAKE_TARGET_LINK_URL);
    },
  );

  it("should prefer the `targetLinkUri` specified by given resource link", async () => {
    const { resourceLink, tool, sessionUserId } = getValidLaunchInitiationData();
    resourceLink.resourceUrl = new URL("/custom-resource-launch", tool.targetLinkUri);

    const result = await sut.initiateLaunch({
      resourceLink,
      sessionUserId,
      tool,
    });

    assert(e.isRight(result));

    const initiationMessageTargetLinkUrl = result.right
      .intoUrl()
      .searchParams.get(TARGET_LINK_PARAM);

    expect(initiationMessageTargetLinkUrl).toBe(resourceLink.resourceUrl?.toString());
  });

  it("should prefer the message's `targetLinkUri` when resource link has no `targetLinkUri`", async () => {
    const { resourceLink, sessionUserId, tool } = getValidLaunchInitiationData();

    resourceLink.resourceUrl = undefined;
    const resourceLinkMessage = new LtiTool.SupportedMessage({
      type: MessageType.resourceLink,
      targetLinkUri: new URL("/resource-link-message", tool.targetLinkUri),
    });

    tool.messages = [resourceLinkMessage];

    const result = await sut.initiateLaunch({
      resourceLink,
      sessionUserId,
      tool,
    });

    assert(e.isRight(result));

    const initiationMessageTargetLinkUrl = result.right
      .intoUrl()
      .searchParams.get(TARGET_LINK_PARAM);

    expect(initiationMessageTargetLinkUrl).toBe(resourceLinkMessage.targetLinkUri?.toString());
  });

  it("should fallback to tool's registered `targetLinkUri` when no value has been provided", async () => {
    const { resourceLink, sessionUserId, tool } = getValidLaunchInitiationData();

    resourceLink.resourceUrl = undefined;
    tool.messages = [];

    const result = await sut.initiateLaunch({ resourceLink, sessionUserId, tool });

    assert(e.isRight(result));

    const initiationMessageTargetLinkUrl = result.right
      .intoUrl()
      .searchParams.get(TARGET_LINK_PARAM);

    expect(initiationMessageTargetLinkUrl).toBe(tool.targetLinkUri.toString());
  });
});
