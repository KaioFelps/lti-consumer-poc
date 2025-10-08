import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("users")
  getUsers() {
    return this.appService.getUsers();
  }

  @Get("person")
  async getPersons() {
    return await this.appService.getPersons();
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
