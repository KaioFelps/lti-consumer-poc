import { either as e } from "fp-ts";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import {
  createToolDeployment,
  createToolGlobalDeployment,
} from "ltilib/tests/common/factories/tool-deployment.factory";
import { InMemoryLtiToolDeploymentsRepository } from "ltilib/tests/common/in-memory-repositories/tool-deployments.repository";
import { MissingLtiContextError } from "$/assignment-and-grade/errors/missing-lti-context.error";
import { ToolIsNotDeployedInContextError } from "$/assignment-and-grade/errors/tool-is-not-deployed-in-context.error";
import { ensureToolIsDeployedInContext } from "./ensure-tool-is-deployed-in-context";

describe("[LTI Advantage/GUARDS] Ensure Tool Is Deployed In Context", () => {
  let deploymentsRepo: InMemoryLtiToolDeploymentsRepository;

  beforeEach(() => {
    deploymentsRepo = new InMemoryLtiToolDeploymentsRepository();
  });

  it("should allow it when the tool has at least one deployment in the given context", async () => {
    const context = createContext();
    const tool = createTool();
    const deployment = createToolDeployment({ context, tool });
    deploymentsRepo.deployments.push(deployment);

    const result = await ensureToolIsDeployedInContext(tool, context, deploymentsRepo)();

    expect(e.isRight(result));
  });

  it("should allow it when the tool has a global deployment", async () => {
    const context = createContext();
    const tool = createTool();
    const toolGlobalDeployment = createToolGlobalDeployment({ tool });

    deploymentsRepo.deployments.push(toolGlobalDeployment);

    const result = await ensureToolIsDeployedInContext(tool, context, deploymentsRepo)();
    assert(e.isRight(result));
  });

  it("should deny it when no context has been provided", async () => {
    // tool indeed has a deployment in some context, but context ain't being provided to the guard
    const context = createContext();
    const tool = createTool();
    const deployment = createToolDeployment({ context, tool });
    deploymentsRepo.deployments.push(deployment);

    const result = await ensureToolIsDeployedInContext(tool, undefined, deploymentsRepo)();

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(MissingLtiContextError);
    expect(result.left.httpStatusCode).toBe(500);
  });

  it("should deny it when there is no deployment of the tool in the given context", async () => {
    const context = createContext();
    const anotherContext = createContext();

    // a tool that has a deployment but in another context
    const tool = createTool();
    const deployment = createToolDeployment({ context: anotherContext, tool });
    deploymentsRepo.deployments.push(deployment);

    const result = await ensureToolIsDeployedInContext(tool, context, deploymentsRepo)();

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(ToolIsNotDeployedInContextError);
    expect(result.left.httpStatusCode).toBe(403);
  });

  it("should deny it when the given tool has no deployments", async () => {
    const context = createContext();
    const tool = createTool();

    const result = await ensureToolIsDeployedInContext(tool, context, deploymentsRepo)();

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(ToolIsNotDeployedInContextError);
    expect(result.left.httpStatusCode).toBe(403);
  });
});
