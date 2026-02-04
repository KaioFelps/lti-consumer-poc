import { Controller, Get, Render } from "@nestjs/common";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { SessionUser } from "@/modules/auth/session-user";
import { User } from "@/modules/identity/user/user.entity";
import { getLtiRolesFromSystemRole } from "@/modules/lti/utils/convert-roles";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { AppService } from "./app.service";
import { IrrecoverableError } from "./core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "./core/errors/resource-not-found.error";
import { Mvc } from "./lib/mvc-routes";
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
      await this.ltiLaunchServices.getLaunchLinks({
        userRoles: getLtiRolesFromSystemRole(user.getSystemRole()),
      }),
      either.foldW(
        async (error: LtiRepositoryError<ResourceNotFoundError>) => ({
          error: await this.t.translate(error.cause.errorMessageIdentifier),
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
