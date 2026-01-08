import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Render,
  Res,
  Session,
} from "@nestjs/common";
import Provider from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { HttpResponse, RequestSession } from "@/lib";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { LtiRegistrationInitiationRequest } from "$/messages/initiate-register";
import { RegisterToolDTO } from "./dtos/register-tool.dto";

@Controller("lti")
export class LtiController {
  @Inject()
  private provider: Provider;

  @Inject()
  private t: TranslatorService;

  @Inject()
  private vars: EnvironmentVars;

  private static toolRegistrationEndpointFlashKey =
    "registerToolInitiateRegisterEndpoint";

  @Mvc()
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

  @Mvc()
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
}
