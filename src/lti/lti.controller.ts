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
    // TODO: render a form to take the register URL and move this initiate message snippet
    // to a POST route to make it *really* dynamic
    const toolRegisterUri =
      "https://127.0.0.1/enrol/lti/register.php?token=2d5793aad442548b34167c65adffe52e54feceb9315fb83163971d34cd15";

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
