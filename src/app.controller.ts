import { Controller, Get, Render } from "@nestjs/common";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { AppService } from "./app.service";
import { SessionUser } from "./auth/session-user";
import { IrrecoverableError } from "./core/errors/irrecoverable-error";
import { User } from "./identity/user/user.entity";
import { Mvc } from "./lib/mvc-routes";
import { getLtiRolesFromSystemRole } from "./lti/utils/convert-roles";
import { TranslatorService } from "./message-string/translator.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly t: TranslatorService,
    private readonly ltiLaunchServices: LtiLaunchServices<IrrecoverableError>,
  ) {}

  @Get("users")
  getUsers() {
    return this.appService.getUsers();
  }

  @Get("person")
  async getPersons() {
    return await this.appService.getPersons();
  }

  @Mvc()
  @Get()
  @Render("home")
  public async home(@SessionUser() user: User) {
    const resourceLinks = await pipe(
      await this.ltiLaunchServices.getLtiLinks(
        getLtiRolesFromSystemRole(user.getSystemRole()),
      ),
      either.foldW(
        async (error) => ({
          error: await this.t.translate(error.errorMessageIdentifier),
        }),
        async (value) => ({ data: value }),
      ),
    );

    return {
      title: await this.t.translate("home-title"),
      resourceLinks,
    };
  }
}
