import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Res,
  Session,
} from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { HttpResponse, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { eitherPromiseToTaskEither as teFromPromise } from "@/lib/fp-ts";
import { Mvc, Rest } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { FindToolByIdService } from "../tools/services/find-tool-by-id.service";
import { DeployToolDto } from "./dtos/deploy-tool.dto";
import { DeployToolService } from "./services/deploy-tool.service";
import { RemoveToolDeploymentService } from "./services/remove-tool-deployment.service";

@Mvc()
@Controller("/lti/deployments")
export class LtiDeploymentsController {
  public constructor(
    private t: TranslatorService,
    private findToolByIdService: FindToolByIdService,
    private deployToolService: DeployToolService,
    private removeDeploymentService: RemoveToolDeploymentService,
  ) {}

  @Post(":toolId/deploy")
  public async deployTool(
    @Param("toolId") toolId: string,
    @Session() session: RequestSession,
    @Body() dto: DeployToolDto,
    @Res() response: HttpResponse,
  ) {
    const deployment = await pipe(
      teFromPromise(() => this.findToolByIdService.exec({ id: toolId })),
      te.chainW((tool) =>
        teFromPromise(() =>
          this.deployToolService.exec({ tool, label: dto.label }),
        ),
      ),
      (a) => a,
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();

    session.flash.activeTab = dto.activeTab;
    session.flash.successMessage = await this.t.translate(
      "lti:deploy-tool:success-message",
      { id: deployment.getId().toString(), label: deployment.getLabel() },
    );

    return response.redirectBack();
  }

  @Rest()
  @Delete(":deploymentId/delete")
  public async removeDeployment(@Param("deploymentId") deploymentId: string) {
    await pipe(
      teFromPromise(() => this.removeDeploymentService.exec({ deploymentId })),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();

    return {
      deploymentId,
      successMessage: await this.t.translate(
        "lti:delete-tool-deployment:success-message",
      ),
    };
  }
}
