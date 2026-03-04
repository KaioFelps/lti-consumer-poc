/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { randomBytes } from "node:crypto";
import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createPlatform } from "ltilib/tests/common/factories/platform.factory";
import { createResourceLink } from "ltilib/tests/common/factories/resource-link.factory";
import toolFactory from "ltilib/tests/common/factories/tool.factory";
import { createToolDeployment } from "ltilib/tests/common/factories/tool-deployment.factory";
import { InMemoryLaunchesRepository } from "ltilib/tests/common/in-memory-repositories/launches.repository";
import { InMemoryLtiLineItemsRepository } from "ltilib/tests/common/in-memory-repositories/line-items.repository";
import { InMemoryLtiResourceLinksRepository } from "ltilib/tests/common/in-memory-repositories/resource-links.repository";
import { InMemoryLtiToolDeploymentsRepository } from "ltilib/tests/common/in-memory-repositories/tool-deployments.repository";
import { InMemoryToolsRepository } from "ltilib/tests/common/in-memory-repositories/tools.repository";
import { ASSIGNMENT_AND_GRADE_SERVICES_SCOPES } from "$/assignment-and-grade/scopes";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim";
import { LtiLaunchData } from "$/core/launch-data";
import { LtiLaunchServices } from "$/core/services/launch";
import { UserIdentity } from "$/core/user-identity";

describe("[AGS] LTI Launch Messages with AGS claim", async () => {
  const REQUIRED_CLAIM = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint";

  const platform = await createPlatform();
  const context = createContext();

  let lineItemsRepo: InMemoryLtiLineItemsRepository;
  let deploymentsRepo: InMemoryLtiToolDeploymentsRepository;
  let toolsRepo: InMemoryToolsRepository;
  let resourceLinksRepo: InMemoryLtiResourceLinksRepository;
  let launchesRepo: InMemoryLaunchesRepository;

  let agsClaimServices: LtiAgsClaimServices;
  let launchServices: LtiLaunchServices;

  beforeEach(() => {
    lineItemsRepo = new InMemoryLtiLineItemsRepository();
    launchesRepo = new InMemoryLaunchesRepository();
    deploymentsRepo = new InMemoryLtiToolDeploymentsRepository();
    resourceLinksRepo = new InMemoryLtiResourceLinksRepository();
    toolsRepo = new InMemoryToolsRepository(
      resourceLinksRepo as InMemoryLtiResourceLinksRepository,
    );

    agsClaimServices = new LtiAgsClaimServices(platform, lineItemsRepo);

    launchServices = new LtiLaunchServices(
      resourceLinksRepo,
      toolsRepo,
      launchesRepo,
      platform,
      agsClaimServices,
    );
  });

  const getValidEntities = ({ scopes }: { scopes: string[] }) => {
    const userId = generateUUID();
    const toolIssuer = new URL(faker.internet.url({ appendSlash: false, protocol: "https" }));
    const toolRedirectUri = new URL("/launch", toolIssuer);

    const tool = toolFactory.createTool({
      scopes,
      ltiConfiguration: toolFactory.createLtiConfiguration({ domain: toolIssuer.host }),
      uris: toolFactory.createUris({ redirect: [toolRedirectUri.toString()] }, toolIssuer),
    });

    const deployment = createToolDeployment({ context, tool });
    const resourceLink = createResourceLink({
      tool,
      contextId: context.id,
      deploymentId: deployment.id,
    });
    const launch = LtiLaunchData.create({ resourceLinkId: resourceLink.id, userId });

    deploymentsRepo.deployments.push(deployment);
    toolsRepo.tools.push(tool);
    resourceLinksRepo.resourceLinks.push(resourceLink);
    launchesRepo.save(launch, 15 * 60);

    return { tool, userId, deployment, resourceLink, launch, toolRedirectUri };
  };

  test.each(ASSIGNMENT_AND_GRADE_SERVICES_SCOPES)(
    "AGS-enabled LTI messages to tools with access to any AGS should contain the service's claim",
    async (scope) => {
      const { launch, toolRedirectUri, userId, tool } = getValidEntities({ scopes: [scope] });

      const launchRequest = await launchServices.authenticateLaunch({
        loginHint: launch.id.toString(),
        messageHint: launch.id.toString(),
        nonce: randomBytes(1024).toString("base64"),
        redirectUri: toolRedirectUri,
        state: randomBytes(512).toString("base64"),
        tool,
        context,
        userIdentity: UserIdentity.create({ id: userId }),
      });

      assert(e.isRight(launchRequest), "it should be a valid launch request");

      const message = launchRequest.right;
      const claims = message.intoLtiClaim();

      expect(claims).toHaveProperty(REQUIRED_CLAIM);
    },
  );

  it("should not contain the service's claim if the tool does not have access to any of them", async () => {
    const { tool, toolRedirectUri, userId, launch } = getValidEntities({ scopes: [] });

    const launchRequest = await launchServices.authenticateLaunch({
      loginHint: launch.id.toString(),
      messageHint: launch.id.toString(),
      nonce: randomBytes(1024).toString("base64"),
      redirectUri: toolRedirectUri,
      state: randomBytes(512).toString("base64"),
      tool,
      context,
      userIdentity: UserIdentity.create({ id: userId }),
    });

    assert(e.isRight(launchRequest), "it should be a valid launch request");

    const claims = launchRequest.right.intoLtiClaim();
    expect(claims).not.toHaveProperty(REQUIRED_CLAIM);
  });

  it.skip("should allow custom parameters to be added to the AGS claim", () => {
    const VALID_CUSTOM_PARAMETER_AS_PER_EXAMPLE = {
      "https://www.toolexample.com/lti/score": {
        originality: 94,
        submissionUrl: "https://www.toolexample.com/lti/score/54/5893/essay.pdf",
      },
    };
    assert(false);
  });

  it.skip("should require custom parameters'keys to be fully qualified URLs", () => {
    assert(false);
  });
});
