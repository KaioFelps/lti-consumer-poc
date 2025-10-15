import { Body, Controller, Inject, Post } from "@nestjs/common";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ExceptionFactory } from "@/lib/exceptions/exception-factory";
import { LoginDTO } from "./dtos/login.dto";
import { RegisterPersonDTO } from "./dtos/register-person.dto";
import { AuthenticateUserService } from "./services/authenticate-user.service";

@Controller("auth")
export class AuthController {
  @Inject()
  private authenticateUserServer: AuthenticateUserService;

  @Post("login")
  public async login(@Body() dto: LoginDTO) {
    const user = pipe(
      await this.authenticateUserServer.execute(dto),
      either.match(
        (error) => {
          throw ExceptionFactory.fromError(error);
        },
        (user) => user,
      ),
    );

    return user;
  }

  @Post("register")
  public async registerPerson(@Body() dto: RegisterPersonDTO) {
    console.log(dto);
  }
}
