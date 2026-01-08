// TODO: handle sessions in a fancy manner, e.g., a middleware
// to reflash or clean flash messages.
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Render,
  Res,
  Session,
} from "@nestjs/common";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { PersonGender } from "@/identity/person/enums/gender";
import { RegisterNewPersonService } from "@/identity/person/services/register-new-person.service";
import { CPF } from "@/identity/person/value-objects/cpf";
import { HttpResponse } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { LoginDTO } from "./dtos/login.dto";
import { RegisterPersonDTO } from "./dtos/register-person.dto";
import { AuthenticateUserService } from "./services/authenticate-user.service";

@Mvc()
@Controller("auth")
export class AuthController {
  @Inject()
  private authenticateUserServer: AuthenticateUserService;

  @Inject()
  private registerNewPersonService: RegisterNewPersonService;

  @Inject()
  private t: TranslatorService;

  @Get("login")
  @Render("login")
  public async showLoginForm() {
    return {
      endpoint: "/auth/login",
      registerEndpoint: "/auth/register",
      title: await this.t.translate("auth:forms:login:title"),
      labels: {
        username: await this.t.translate("auth:forms:login:labels:username"),
        password: await this.t.translate("auth:forms:login:labels:password"),
      },
      buttons: {
        login: await this.t.translate("auth:forms:login:buttons:login"),
        noAccount: await this.t.translate(
          "auth:forms:login:buttons:no-account",
        ),
      },
    };
  }

  @Post("login")
  public async login(@Body() dto: LoginDTO) {
    const user = pipe(
      await this.authenticateUserServer.execute(dto),
      either.match(
        (error) => {
          throw ExceptionsFactory.fromError(error);
        },
        (user) => user,
      ),
    );

    return user;
  }

  @Get("register")
  @Render("register")
  public async showRegisterForm() {
    return {
      title: await this.t.translate("auth:forms:register:title"),
      endpoint: "/auth/register",
      loginEndpoint: "/auth/login",
      labels: {
        username: await this.t.translate("auth:forms:register:labels:username"),
        password: await this.t.translate("auth:forms:register:labels:password"),
        cpf: await this.t.translate("auth:forms:register:labels:cpf"),
        birthDate: await this.t.translate(
          "auth:forms:register:labels:birth-date",
        ),
        firstName: await this.t.translate(
          "auth:forms:register:labels:first-name",
        ),
        surname: await this.t.translate("auth:forms:register:labels:surname"),
        email: await this.t.translate("auth:forms:register:labels:email"),
        gender: await this.t.translate("auth:forms:register:labels:gender"),
      },
      buttons: {
        create: await this.t.translate("auth:forms:register:buttons:create"),
        alreadyHasAccount: await this.t.translate(
          "auth:forms:register:buttons:already-has-account",
        ),
      },
    };
  }

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
      loginButtonMessage: await this.t.translate(
        "auth:forms:register:buttons:go-login",
      ),
    };

    return response.redirectBack();
  }
}
