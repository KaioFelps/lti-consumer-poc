import {
  All,
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Post,
  Redirect,
  Render,
  Req,
  Res,
  Session,
} from "@nestjs/common";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { EnvironmentVars } from "@/config/environment-vars.js";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory.js";
import { Mvc } from "@/lib/mvc-routes.js";
import type { HttpRequest, HttpResponse } from "@/lib.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { PersonGender } from "@/modules/identity/person/enums/gender.js";
import { RegisterNewPersonService } from "@/modules/identity/person/services/register-new-person.service.js";
import { CPF } from "@/modules/identity/person/value-objects/cpf.js";
import { User } from "@/modules/identity/user/user.entity.js";
import { LoginViewManager } from "@/modules/oidc/view-manager/login.js";
import { Routes } from "@/routes.js";
import { LoginDTO } from "./dtos/login.dto.js";
import { RegisterPersonDTO } from "./dtos/register-person.dto.js";
import { Public } from "./protected-routes.js";
import { AuthenticateUserService } from "./services/authenticate-user.service.js";
import sessionUser, { SessionUser } from "./session-user.js";

@Mvc()
@Controller("auth")
export class AuthController {
  @Inject()
  private authenticateUserServer!: AuthenticateUserService;

  @Inject()
  private registerNewPersonService!: RegisterNewPersonService;

  @Inject()
  private t!: TranslatorService;

  @Inject()
  private env!: EnvironmentVars;

  @Public()
  @Get("login")
  public async showLoginForm(
    @Req() request: HttpRequest,
    @Res() response: HttpResponse,
    @SessionUser() user?: User,
  ) {
    const userIsLoggedIn = Boolean(user);

    if (userIsLoggedIn) return response.redirect("/");

    const destiny = request.headers.referer ?? "/";

    const loginView = new LoginViewManager({
      loginEndpoint: Routes.auth.login(),
      translatorService: this.t,
      localeHint: this.t.getLocale(),
      destinyEndpoint: destiny,
    });

    return response.render(loginView.getView(), await loginView.getRenderData());
  }

  @Public()
  @Post("login")
  public async login(
    @Body() dto: LoginDTO,
    @Req() request: HttpRequest,
    @Res() response: HttpResponse,
  ) {
    const { destiny, ...credentials } = dto;

    const user = pipe(
      await this.authenticateUserServer.execute(credentials),
      either.match(
        (error) => {
          throw ExceptionsFactory.fromError(error);
        },
        (user) => user,
      ),
    );

    sessionUser.saveSessionUser(request, user);

    // An attacker may modify the form and try to redirect the user to somewhere else.
    // This ensures the destiny URL is in the application for a simple login.
    // If an attacker modifies the destiny URL to an invalid URL string, URL constructor
    // may throw an error. Given any of these conditions, we redirect user back.
    try {
      const appUrl = new URL(this.env.app.url);
      const isUrlSafe = new URL(destiny, this.env.app.url).host === appUrl.host;
      if (isUrlSafe) return response.redirect(HttpStatus.SEE_OTHER, destiny);
    } catch (_e) {}

    return response.redirectBack();
  }

  @Public()
  @Get("register")
  @Render("register")
  public async showRegisterForm() {
    return { title: await this.t.translate("auth:forms:register:title") };
  }

  @Public()
  @Post("register")
  public async registerPerson(
    @Res() response: HttpResponse,
    @Body() dto: RegisterPersonDTO,
    @Session() session: Record<string, unknown>,
  ) {
    const newPersonResult = await this.registerNewPersonService.execute({
      birthDate: dto.birthDate,
      cpf: CPF.createUnchecked(dto.cpf),
      email: dto.email,
      firstName: dto.firstName,
      password: dto.password,
      surname: dto.surname,
      username: dto.username,
      gender: dto.gender && PersonGender[dto.gender],
    });

    if (either.isLeft(newPersonResult)) {
      throw ExceptionsFactory.fromError(newPersonResult.left);
    }

    const person = newPersonResult.right;
    // return PersonPresenter.present(person);

    if (!session.flash) session.flash = {};
    (session.flash as Record<string, unknown>).success = {
      message: await this.t.translate("auth:forms:register:success-message", {
        id: person.getUser().getId().toString(),
      }),
      loginButtonMessage: await this.t.translate("auth:forms:register:buttons:go-login"),
    };

    return response.redirectBack();
  }

  @Mvc()
  @Public()
  @All("logout")
  @Redirect("/")
  public async logout(@Req() request: HttpRequest) {
    sessionUser.removeSessionUser(request);
  }
}
