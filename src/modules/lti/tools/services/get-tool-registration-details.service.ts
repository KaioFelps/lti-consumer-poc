import { Inject, Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { eitherPromiseToTaskEither } from "@/lib/fp-ts";
import { LtiToolDetails } from "../entities/aggregations/tool-details";
import { LtiTool } from "../entities/lti-tool.entity";
import { LtiToolsRepository } from "../lti-tools.repository";
import { LtiToolsDeploymentsRepository } from "../lti-tools-deployments.repository";

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
      eitherPromiseToTaskEither(() => this.toolsRepo.findToolById(toolId)),
      te.map((tool) => {
        return pipe(
          eitherPromiseToTaskEither(() =>
            this.deploymentsRepo.findManyByToolId(tool.id),
          ),
          te.map((deployments) =>
            LtiToolDetails.create({ tool: new LtiTool(tool), deployments }),
          ),
          eitherPromiseToTaskEither,
        );
      }),
      te.flattenW,
    )();
  }
}
