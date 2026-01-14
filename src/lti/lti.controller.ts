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
import { either, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import Provider from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { LtiToolPresenter } from "@/external/presenters/entities/lti-tool.presenter";
import { LtiToolDeploymentPresenter } from "@/external/presenters/entities/lti-tool-deployment.presenter";
import { LtiToolPreviewPresenter } from "@/external/presenters/entities/lti-tool-preview.presenter";
import { HttpResponse, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { eitherPromiseToTaskEither as teFromPromise } from "@/lib/fp-ts";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { LtiRegistrationInitiationRequest } from "$/messages/initiate-register";
import { DeployToolDto } from "./dtos/deploy-tool.dto";
import { RegisterToolDTO } from "./dtos/register-tool.dto";
import { DeployToolService } from "./tools/services/deploy-tool.service";
import { FindManyToolsPreviewsService } from "./tools/services/find-many-tools-previews.service";
import { FindToolByIdService } from "./tools/services/find-tool-by-id.service";
import { GetToolRegistrationDetailsService } from "./tools/services/get-tool-registration-details.service";

@Mvc()
@Controller("lti")
export class LtiController {
  public constructor(
    private vars: EnvironmentVars,
    private provider: Provider,
    private t: TranslatorService,
    private findToolByIdService: FindToolByIdService,
    private findManyToolsService: FindManyToolsPreviewsService,
    private getToolDetailsService: GetToolRegistrationDetailsService,
    private deployToolService: DeployToolService,
  ) {}

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
          endpoints: {
            deployments: `/lti/tools/${tool.id}/details#tooldeployments`,
            details: `/lti/tools/${tool.id}/details#tooldetails`,
          },
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
        toolDetails: await this.t.translate(
          "lti:list-tools:buttons:tool-details",
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

  @Get("/tools/:id/details")
  @Render("tool-details")
  public async showToolDetails(@Param("id") toolId: string) {
    const toolDetails = pipe(
      await this.getToolDetailsService.exec({ toolId }),
      either.foldW(
        (error) => {
          throw ExceptionsFactory.fromError(error);
        },
        (tool) => tool,
      ),
    );

    return {
      title: await this.t.translate("lti:tools-details:title", {
        toolName: toolDetails.getTool().record.name,
      }),
      deployPopupTitle: await this.t.translate("lti:deploy-tool:popup-title"),
      tool: LtiToolPresenter.present(toolDetails.getTool()),
      deployments: toolDetails
        .getDeployments()
        .map(LtiToolDeploymentPresenter.present),
      deploymentEndpoint: `/lti/tools/${toolDetails.getTool().record.id}/deploy`,
      buttons: {
        detailsTab: await this.t.translate(
          "lti:list-tools:buttons:tool-details",
        ),
        deploymentsTab: await this.t.translate(
          "lti:list-tools:buttons:list-deployments",
        ),
        deploy: await this.t.translate("lti:tools-details:buttons:new-deploy"),
        confirm: await this.t.translate("buttons:confirm"),
        cancel: await this.t.translate("buttons:cancel"),
      },
      content: {
        invalidTabSelected: await this.t.translate(
          "lti:tools-details:invalid-tab-selected",
        ),
        noDeploymentsMessage: await this.t.translate(
          "lti:tools-details:no-tool-deployments",
        ),
      },
      toolTableHeadings: {
        id: await this.t.translate("lti:tools-details:thead:id"),
        name: await this.t.translate("lti:tools-details:thead:name"),
        description: await this.t.translate(
          "lti:tools-details:thead:description",
        ),
        grantTypes: await this.t.translate(
          "lti:tools-details:thead:grant-types",
        ),
        initiateUri: await this.t.translate(
          "lti:tools-details:thead:initiate-uri",
        ),
        homePageUri: await this.t.translate(
          "lti:tools-details:thead:home-page-uri",
        ),
        logoUri: await this.t.translate("lti:tools-details:thead:logo-uri"),
        termsOfServiceUri: await this.t.translate(
          "lti:tools-details:thead:tos-uri",
        ),
        policyUri: await this.t.translate("lti:tools-details:thead:policy-uri"),
        contacts: await this.t.translate("lti:tools-details:thead:contacts"),
        registeredMessages: await this.t.translate(
          "lti:tools-details:thead:registered-msgs",
        ),
        requiredClaims: await this.t.translate(
          "lti:tools-details:thead:required-claims",
        ),
      },

      deploymentTableHeadings: {
        id: await this.t.translate("lti:tools-details:thead:deployment-id"),
        label: await this.t.translate(
          "lti:tools-details:thead:deployment-label",
        ),
      },
    };
  }

  @Post("tools/:id/deploy")
  public async deployTool(
    @Param("id") toolId: string,
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
}
