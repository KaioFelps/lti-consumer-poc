import { Inject, Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { LtiToolDetails } from "../entities/aggregations/tool-details.js";
import { LtiTool } from "../entities/lti-tool.entity.js";
import { LtiToolsRepository } from "../lti-tools.repository.js";
import { LtiToolsDeploymentsRepository } from "../lti-tools-deployments.repository.js";

type Params = {
  toolId: string;
};

@Injectable()
export class GetToolRegistrationDetailsService {
  @Inject()
  private readonly toolsRepo: LtiToolsRepository;

  @Inject()
  private readonly deploymentsRepo: LtiToolsDeploymentsRepository;

  public async exec({ toolId }: Params) {
    return await pipe(
      te.Do,
      te.apS("tool", () => this.toolsRepo.findToolById(toolId)),
      te.bindW(
        "deployments",
        ({ tool }) =>
          () =>
            this.deploymentsRepo.findManyByToolId(tool.id),
      ),
      te.map(({ tool, deployments }) =>
        LtiToolDetails.create({ tool: new LtiTool(tool), deployments }),
      ),
    )();
  }
}
