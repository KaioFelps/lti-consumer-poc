import { Body, Controller, Get, Param, Post, Render, Res, Session } from "@nestjs/common";
import { either, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { ErrorBase } from "@/core/errors/error-base.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { ErrorBaseRenderableError } from "@/core/errors/renderable/error-base.error.js";
import { LtiToolPresenter } from "@/external/presenters/entities/lti-tool.presenter.js";
import { LtiToolDeploymentPresenter } from "@/external/presenters/entities/lti-tool-deployment.presenter.js";
import { LtiToolPreviewPresenter } from "@/external/presenters/entities/lti-tool-preview.presenter.js";
import { RenderAsync } from "@/lib/async-render/index.js";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory.js";
import { Mvc } from "@/lib/mvc-routes.js";
import type { HttpResponse, RequestSession } from "@/lib.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { Routes } from "@/routes.js";
import { Platform } from "$/core/platform.js";
import { LtiRegistrationInitiationRequest } from "$/registration/messages/initiate-registration.js";
import { RegisterToolDTO } from "./dtos/register-tool.dto.js";
import { FindManyToolsPreviewsService } from "./services/find-many-tools-previews.service.js";
import { GetToolRegistrationDetailsService } from "./services/get-tool-registration-details.service.js";

@Mvc()
@Controller("/lti/tools")
export class LtiToolsController {
  public constructor(
    private platform: Platform,
    private t: TranslatorService,
    private findManyToolsService: FindManyToolsPreviewsService,
    private getToolDetailsService: GetToolRegistrationDetailsService,
  ) {}

  private static toolRegistrationEndpointFlashKey = "registerToolInitiateRegisterEndpoint";

  @Get("register")
  @Render("register-new-tool")
  public async register(@Res() response: HttpResponse) {
    const initiateRegisterEndpoint = response.locals.flash[
      LtiToolsController.toolRegistrationEndpointFlashKey
    ] as string | undefined;

    return {
      title: await this.t.translate("lti:register-tool:title"),
      initiateRegisterEndpoint,
    };
  }

  @Post("register")
  public async storeToolRecord(
    @Res() response: HttpResponse,
    @Body() dto: RegisterToolDTO,
    @Session() session: RequestSession,
  ) {
    const initiateRegister = new LtiRegistrationInitiationRequest({
      platformOpenIdConfigurationUri: new URL(
        Routes.lti.openIdConfiguration(),
        this.platform.issuer,
      ),
      toolInitiateRegisterUri: new URL(dto.registrationEndpoint),
    });

    session.flash[LtiToolsController.toolRegistrationEndpointFlashKey] = initiateRegister
      .intoUrl()
      .toString();

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
    const toolDetails = await pipe(
      () => this.getToolDetailsService.exec({ toolId }),
      te.getOrElseW((error) => async () => {
        const innerError = error instanceof IrrecoverableError ? error : (error.cause as ErrorBase);
        const renderable = await ErrorBaseRenderableError.create(innerError, this.t);
        throw ExceptionsFactory.fromError(renderable);
      }),
    )();

    return {
      title: await this.t.translate("lti:tools-details:title", {
        toolName: toolDetails.getTool().record.name,
      }),
      tool: LtiToolPresenter.present(toolDetails.getTool()),
      deployments: toolDetails.getDeployments().map(LtiToolDeploymentPresenter.present),
    };
  }
}
