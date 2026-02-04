import { All, Controller, Inject } from "@nestjs/common";
import { Public } from "@/modules/auth/public-routes";
import { Platform } from "$/core/platform";

@Public()
@Controller("lti")
export class LtiController {
  @Inject()
  private readonly platform: Platform;

  @All(".well-known/openid-configuration")
  public async LtiAndOpenIdConfiguration() {
    return this.platform.resolvedOpenIdConfiguration;
  }
}
