import { Body, Controller, Inject, Post } from "@nestjs/common";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { PersonPresenter } from "@/external/presenters/entities/person.presenter";
import { PersonGender } from "@/identity/person/enums/gender";
import { RegisterNewPersonService } from "@/identity/person/services/register-new-person.service";
import { CPF } from "@/identity/person/value-objects/cpf";
import { MVC } from "@/lib/decorators/mvc-route";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { LoginDTO } from "./dtos/login.dto";
import { RegisterPersonDTO } from "./dtos/register-person.dto";
import { AuthenticateUserService } from "./services/authenticate-user.service";

@MVC()
@Controller("auth")
export class AuthController {
  @Inject()
  private authenticateUserServer: AuthenticateUserService;

  @Inject()
  private registerNewPersonService: RegisterNewPersonService;

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

  @Post("register")
  public async registerPerson(@Body() dto: RegisterPersonDTO) {
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
    return PersonPresenter.present(person);
  }
}
