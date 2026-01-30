import { Controller, Get, Inject } from "@nestjs/common";
import { Platform } from "$/core/platform";

@Controller("lti")
export class LtiController {
  @Inject()
  private readonly platform: Platform;

  @Get(".well-known/openid-configuration")
  public async LtiAndOpenIdConfiguration() {
    return this.platform.resolvedOpenIdConfiguration;
  }
}
