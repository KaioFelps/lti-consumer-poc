import { Controller, Get, Inject, Render } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars";
import { TranslatorService } from "@/message-string/translator.service";
import { OIDCProvider } from "@/oidc/provider";
import { LtiRegistrationInitiationRequest } from "$/messages/initiate-register";

@Controller("lti")
export class LtiController {
  @Inject()
  private provider: OIDCProvider;

  @Inject()
  private t: TranslatorService;

  @Inject()
  private vars: EnvironmentVars;

  @Get("register")
  @Render("register-new-tool")
  public async register() {
    const toolRegisterUri = "http://localhost/enrol/lti/register.php?token=";

    const issuer =
      this.vars.nodeEnv === "development"
        ? "http://host.docker.internal:3000/oidc"
        : this.provider.issuer;

    const openIdConfigurationUri = `${issuer}/.well-known/openid-configuration`;

    const initiateRegister = new LtiRegistrationInitiationRequest({
      platformOpenIdConfigurationUri: new URL(openIdConfigurationUri),
      toolInitiateRegisterUri: new URL(toolRegisterUri),
    });

    return {
      locale: this.t.getLocale(),
      title: await this.t.translate("lti:register:title"),
      registerUri: initiateRegister.intoUrl(),
      labels: {
        registerPlatform: await this.t.translate(
          "lti:register:labels:register-platform",
        ),
      },
    };
  }
}
