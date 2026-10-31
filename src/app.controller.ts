import { Controller, Get, Render } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { SessionUser } from "@/modules/auth/session-user.js";
import { User } from "@/modules/identity/user/user.entity.js";
import { mapRolesToLtiSystemRoles } from "@/modules/lti/mappers/convert-roles.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiLaunchServices } from "$/core/services/launch.services.js";
import { AppService } from "./app.service.js";
import { ResourceNotFoundError } from "./core/errors/resource-not-found.error.js";
import { Mvc } from "./lib/mvc-routes.js";
import { TranslatorService } from "./message-string/translator.service.js";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly t: TranslatorService,
    private readonly ltiLaunchServices: LtiLaunchServices,
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
      () =>
        this.ltiLaunchServices.getLaunchLinks({
          userRoles: mapRolesToLtiSystemRoles(user.getSystemRole()),
        }),
      te.foldW(
        (error) => async () => {
          const { cause } = error as LtiRepositoryError<ResourceNotFoundError>;
          return {
            error: await this.t.translate(cause.errorMessageIdentifier),
          };
        },
        (value) => async () => ({ data: value }),
      ),
    )();

    return {
      title: await this.t.translate("home-title"),
      resourceLinks,
    };
  }
}
