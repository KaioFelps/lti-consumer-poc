import {
  Body,
  Controller,
  Get,
  Inject,
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
import { LtiToolPreviewPresenter } from "@/external/presenters/entities/lti-tool-preview.presenter";
import { HttpResponse, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { LtiRegistrationInitiationRequest } from "$/messages/initiate-register";
import { RegisterToolDTO } from "./dtos/register-tool.dto";
import { FindManyToolsPreviewsService } from "./tools/services/find-many-tools-previews.service";

@Mvc()
@Controller("lti")
export class LtiController {
  @Inject()
  private provider: Provider;

  @Inject()
  private t: TranslatorService;

  @Inject()
  private findManyToolsService: FindManyToolsPreviewsService;

  @Inject()
  private vars: EnvironmentVars;

  private static toolRegistrationEndpointFlashKey =
    "registerToolInitiateRegisterEndpoint";

  @Get("register")
  @Render("register-new-tool")
  public async register(@Res() response: HttpResponse) {
    const initiateRegisterEndpoint = response.locals.flash[
      LtiController.toolRegistrationEndpointFlashKey
    ] as string | undefined;

    return {
      title: await this.t.translate("lti:register-tool:title"),
      endpoint: "/lti/register",
      shallShowDockerInternalHostOption: this.vars.nodeEnv === "development",
      labels: {
        registrationEndpoint: await this.t.translate(
          "lti:register-tool:labels:register-platform",
        ),
        useDockerInternalHost: await this.t.translate(
          "lti:register-tool:labels:use-docker-internal-host",
        ),
      },
      descriptions: {
        useDockerInternalHost: await this.t.translate(
          "lti:register-tool:descriptions:use-docker-internal-host",
        ),
      },
      buttons: {
        submit: await this.t.translate(
          "lti:register-tool:buttons:register-tool",
        ),
      },
      initiateRegister: {
        endpoint: initiateRegisterEndpoint,
        successMessage: await this.t.translate(
          "lti:register-tool:registration-success-message",
        ),
        readyToGoParagraph: await this.t.translate(
          "lti:register-tool:ready-to-go-paragraph",
        ),
        finishRegistrationButton: await this.t.translate(
          "lti:register-tool:buttons:finish-registration",
        ),
        popupTitle: await this.t.translate("lti:register-tool:popup-title"),
      },
    };
  }

  @Post("register")
  public async storeToolRecord(
    @Res() response: HttpResponse,
    @Body() dto: RegisterToolDTO,
    @Session() session: RequestSession,
  ) {
    // const toolRegisterUri =
    //   "https://127.0.0.1/enrol/lti/register.php?token=2d5793aad442548b34167c65adffe52e54feceb9315fb83163971d34cd15";

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

    session.flash[LtiController.toolRegistrationEndpointFlashKey] =
      initiateRegister.intoUrl().toString();

    return response.redirectBack();
  }

  @Get("tools")
  @Render("list-tools")
  public async showTools() {
    const tools = pipe(
      await this.findManyToolsService.exec(),
      either.map((tools) =>
        tools.map(LtiToolPreviewPresenter.present).map((tool) => ({
          ...tool,
          endpoints: { deployments: `/lti/tools/${tool.id}/deployments` },
        })),
      ),
      either.foldW(
        (error) => {
          throw ExceptionsFactory.fromError(error);
        },
        (tools) => tools,
      ),
    );

    return {
      tools,
      title: await this.t.translate("lti:list-tools:title"),
      registerNewToolEndpoint: "/lti/register",
      tableHeadings: {
        toolName: await this.t.translate("lti:list-tools:thead:tool-name"),
        toolDetails: await this.t.translate(
          "lti:list-tools:thead:tool-details",
        ),
        actions: await this.t.translate("table-headings:actions"),
      },
      toolsFields: {
        id: await this.t.translate("lti:list-tools:tool-field:id"),
        name: await this.t.translate("lti:list-tools:tool-field:id"),
        description: await this.t.translate(
          "lti:list-tools:tool-field:description",
        ),
        homePageUri: await this.t.translate(
          "lti:list-tools:tool-field:home-page-uri",
        ),
      },
      buttons: {
        deployments: await this.t.translate(
          "lti:list-tools:buttons:list-deployments",
        ),
        registerNewTool: await this.t.translate(
          "lti:list-tools:buttons:register-new-tool",
        ),
      },
      content: {
        noToolsMessage: await this.t.translate(
          "lti:list-tools:no-tools-registered",
        ),
      },
    };
  }

  @Get("/deploy/:id")
  public async deployTool(@Param("id") toolId: string) {}
}
