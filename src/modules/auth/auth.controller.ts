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
import { pipe } from "fp-ts/lib/function";
import { EnvironmentVars } from "@/config/environment-vars";
import { HttpRequest, HttpResponse } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { PersonGender } from "@/modules/identity/person/enums/gender";
import { RegisterNewPersonService } from "@/modules/identity/person/services/register-new-person.service";
import { CPF } from "@/modules/identity/person/value-objects/cpf";
import { User } from "@/modules/identity/user/user.entity";
import { LoginViewManager } from "@/modules/oidc/view-manager/login";
import { Routes } from "@/routes";
import { LoginDTO } from "./dtos/login.dto";
import { RegisterPersonDTO } from "./dtos/register-person.dto";
import { Public } from "./public-routes";
import { AuthenticateUserService } from "./services/authenticate-user.service";
import sessionUser, { SessionUser } from "./session-user";

@Mvc()
@Controller("auth")
export class AuthController {
  @Inject()
  private authenticateUserServer: AuthenticateUserService;

  @Inject()
  private registerNewPersonService: RegisterNewPersonService;

  @Inject()
  private t: TranslatorService;

  @Inject()
  private env: EnvironmentVars;

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
