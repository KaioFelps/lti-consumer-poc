import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Render,
  Res,
  Session,
} from "@nestjs/common";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import Provider from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { ErrorBase } from "@/core/errors/error-base";
import { LtiToolPresenter } from "@/external/presenters/entities/lti-tool.presenter";
import { LtiToolDeploymentPresenter } from "@/external/presenters/entities/lti-tool-deployment.presenter";
import { LtiToolPreviewPresenter } from "@/external/presenters/entities/lti-tool-preview.presenter";
import { HttpResponse, RequestSession } from "@/lib";
import { RenderAsync } from "@/lib/async-render";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiRegistrationInitiationRequest } from "$/messages/initiate-register";
import { RegisterToolDTO } from "./dtos/register-tool.dto";
import { FindManyToolsPreviewsService } from "./services/find-many-tools-previews.service";
import { GetToolRegistrationDetailsService } from "./services/get-tool-registration-details.service";

@Mvc()
@Controller("/lti/tools")
export class LtiToolsController {
  public constructor(
    private vars: EnvironmentVars,
    private provider: Provider,
    private t: TranslatorService,
    private findManyToolsService: FindManyToolsPreviewsService,
    private getToolDetailsService: GetToolRegistrationDetailsService,
  ) {}

  private static toolRegistrationEndpointFlashKey =
    "registerToolInitiateRegisterEndpoint";

  @Get("register")
  @Render("register-new-tool")
  public async register(@Res() response: HttpResponse) {
    const initiateRegisterEndpoint = response.locals.flash[
      LtiToolsController.toolRegistrationEndpointFlashKey
    ] as string | undefined;

    return {
      title: await this.t.translate("lti:register-tool:title"),
      shallShowDockerInternalHostOption: this.vars.nodeEnv === "development",
      initiateRegisterEndpoint,
    };
  }

  @Post("register")
  public async storeToolRecord(
    @Res() response: HttpResponse,
    @Body() dto: RegisterToolDTO,
    @Session() session: RequestSession,
  ) {
    const shouldUseDockerInternalHost =
      this.vars.nodeEnv === "development" && dto.useDockerInternalHost;

    const issuer = shouldUseDockerInternalHost
      ? "http://host.docker.internal:3000/oidc"
      : this.provider.issuer;

    const openIdConfigurationUri = `${issuer}/.well-known/openid-configuration`;

    const initiateRegister = new LtiRegistrationInitiationRequest({
      platformOpenIdConfigurationUri: new URL(openIdConfigurationUri),
      toolInitiateRegisterUri: new URL(dto.registrationEndpoint),
    });

    session.flash[LtiToolsController.toolRegistrationEndpointFlashKey] =
      initiateRegister.intoUrl().toString();

    return response.redirectBack();
  }

  @Get()
  @RenderAsync("list-tools")
  public async showTools() {
    const tools = pipe(
      await this.findManyToolsService.exec(),
      either.map((tools) => tools.map(LtiToolPreviewPresenter.present)),
      either.getOrElseW((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    );

    return {
      tools,
      title: await this.t.translate("lti:list-tools:title"),
    };
  }

  @Get(":id/details")
  @Render("tool-details")
  public async showToolDetails(@Param("id") toolId: string) {
    const toolDetails = pipe(
      await this.getToolDetailsService.exec({ toolId }),
      either.getOrElseW((error: LtiRepositoryError<ErrorBase>) => {
        throw ExceptionsFactory.fromError(error.cause);
      }),
    );

    return {
      title: await this.t.translate("lti:tools-details:title", {
        toolName: toolDetails.getTool().record.name,
      }),
      tool: LtiToolPresenter.present(toolDetails.getTool()),
      deployments: toolDetails
        .getDeployments()
        .map(LtiToolDeploymentPresenter.present),
    };
  }
}
