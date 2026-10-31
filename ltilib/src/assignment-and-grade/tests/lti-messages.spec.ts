/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { randomBytes } from "node:crypto";
import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid.js";
import { either as e } from "fp-ts";
import { ASSIGNMENT_AND_GRADE_SERVICES_SCOPES } from "$/assignment-and-grade/scopes.js";
import { LtiAgsClaimServices } from "$/assignment-and-grade/services/ags-claim.services.js";
import { LtiLaunchData } from "$/core/launch-data.js";
import { LtiLaunchServices } from "$/core/services/launch.services.js";
import { UserIdentity } from "$/core/user-identity.js";
import { createContext } from "$/tests/common/factories/context.factory.js";
import { createPlatform } from "$/tests/common/factories/platform.factory.js";
import { createResourceLink } from "$/tests/common/factories/resource-link.factory.js";
import toolFactory from "$/tests/common/factories/tool.factory.js";
import { createToolDeployment } from "$/tests/common/factories/tool-deployment.factory.js";
import { InMemoryLtiContextsRepository } from "$/tests/common/in-memory-repositories/contexts.repository.js";
import { InMemoryLaunchesRepository } from "$/tests/common/in-memory-repositories/launches.repository.js";
import { InMemoryLtiLineItemsRepository } from "$/tests/common/in-memory-repositories/line-items.repository.js";
import { InMemoryLtiResourceLinksRepository } from "$/tests/common/in-memory-repositories/resource-links.repository.js";
import { InMemoryLtiToolDeploymentsRepository } from "$/tests/common/in-memory-repositories/tool-deployments.repository.js";
import { InMemoryToolsRepository } from "$/tests/common/in-memory-repositories/tools.repository.js";
import { InMemoryUserIdentitiesRepository } from "$/tests/common/in-memory-repositories/user-identities.repository.js";

describe("[AGS] LTI Launch Messages with AGS claim", async () => {
  const REQUIRED_CLAIM = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint";

  const platform = await createPlatform();
  const context = createContext();

  let lineItemsRepo: InMemoryLtiLineItemsRepository;
  let deploymentsRepo: InMemoryLtiToolDeploymentsRepository;
  let toolsRepo: InMemoryToolsRepository;
  let resourceLinksRepo: InMemoryLtiResourceLinksRepository;
  let launchesRepo: InMemoryLaunchesRepository;
  let userIdentitiesRepo: InMemoryUserIdentitiesRepository;
  let contextsRepository: InMemoryLtiContextsRepository;

  let agsClaimServices: LtiAgsClaimServices;
  let launchServices: LtiLaunchServices<never, unknown>;

  beforeEach(() => {
    lineItemsRepo = new InMemoryLtiLineItemsRepository();
    launchesRepo = new InMemoryLaunchesRepository();
    deploymentsRepo = new InMemoryLtiToolDeploymentsRepository();
    resourceLinksRepo = new InMemoryLtiResourceLinksRepository();
    userIdentitiesRepo = new InMemoryUserIdentitiesRepository();
    toolsRepo = new InMemoryToolsRepository(
      resourceLinksRepo as InMemoryLtiResourceLinksRepository,
    );
    contextsRepository = new InMemoryLtiContextsRepository();

    agsClaimServices = new LtiAgsClaimServices(platform, lineItemsRepo);

    launchServices = new LtiLaunchServices<never, unknown>(
      resourceLinksRepo,
      toolsRepo,
      launchesRepo,
      userIdentitiesRepo,
      platform,
      agsClaimServices,
      contextsRepository,
    );
  });

  const getValidEntities = ({ scopes }: { scopes: string[] }) => {
    const userId = generateUUID();
    const toolIssuer = new URL(faker.internet.url({ appendSlash: false, protocol: "https" }));
    const toolRedirectUri = new URL("/launch", toolIssuer).toString();

    const tool = toolFactory.createTool({
      scopes,
      domain: toolIssuer.host,
      redirectUrls: [toolRedirectUri.toString()],
    });

    const deployment = createToolDeployment({ context, tool });
    const resourceLink = createResourceLink({
      tool,
      contextId: context.id,
      deploymentId: deployment.id,
    });
    const launch = LtiLaunchData.create({
      resourceLinkId: resourceLink.id,
      userId,
      targetLinkUrl: tool.targetLinkUri,
    });

    deploymentsRepo.deployments.push(deployment);
    toolsRepo.tools.push(tool);
    resourceLinksRepo.resourceLinks.push(resourceLink);
    launchesRepo.save(launch, 15 * 60);
    userIdentitiesRepo.users.push(UserIdentity.create({ id: userId }));

    return { tool, userId, deployment, resourceLink, launch, toolRedirectUri };
  };

  test.each(ASSIGNMENT_AND_GRADE_SERVICES_SCOPES)(
    "AGS-enabled LTI messages to tools with access to any AGS should contain the service's claim",
    async (scope) => {
      const { launch, toolRedirectUri, tool } = getValidEntities({ scopes: [scope] });

      const launchRequest = await launchServices.authenticateLaunch({
        loginHint: launch.id.toString(),
        messageHint: launch.id.toString(),
        nonce: randomBytes(1024).toString("base64"),
        redirectUri: toolRedirectUri,
        state: randomBytes(512).toString("base64"),
        toolId: tool.id,
        contextOverride: context,
        prompt: "none",
        response_mode: "form_post",
        response_type: "id_token",
        scope: "openid",
      });

      assert(e.isRight(launchRequest), "it should be a valid launch request");

      const message = launchRequest.right;
      const claims = message.rawContent.intoLtiClaim();

      expect(claims).toHaveProperty(REQUIRED_CLAIM);
    },
  );

  it("should not contain the service's claim if the tool does not have access to any of them", async () => {
    const { tool, toolRedirectUri, launch } = getValidEntities({ scopes: [] });

    const launchRequest = await launchServices.authenticateLaunch({
      loginHint: launch.id.toString(),
      messageHint: launch.id.toString(),
      nonce: randomBytes(1024).toString("base64"),
      redirectUri: toolRedirectUri,
      state: randomBytes(512).toString("base64"),
      toolId: tool.id,
      contextOverride: context,
      prompt: "none",
      response_mode: "form_post",
      response_type: "id_token",
      scope: "openid",
    });

    assert(e.isRight(launchRequest), "it should be a valid launch request");

    const claims = launchRequest.right.rawContent.intoLtiClaim();
    expect(claims).not.toHaveProperty(REQUIRED_CLAIM);
  });
});
