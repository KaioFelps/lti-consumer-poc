import { All, Controller, Inject } from "@nestjs/common";
import { Public } from "@/modules/auth/protected-routes.js";
import { Platform } from "$/core/platform.js";

@Public()
@Controller("lti")
export class LtiController {
  @Inject()
  private readonly platform!: Platform;

  @All(".well-known/openid-configuration")
  public async LtiAndOpenIdConfiguration() {
    return this.platform.resolvedOpenIdConfiguration;
  }
}
