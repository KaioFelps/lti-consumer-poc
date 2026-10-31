import { Module } from "@nestjs/common";
import { FindPersonByIdService } from "./services/find-person-by-id.service.js";
import { RegisterNewPersonService } from "./services/register-new-person.service.js";

@Module({
  providers: [RegisterNewPersonService, FindPersonByIdService],
  exports: [RegisterNewPersonService, FindPersonByIdService],
})
export class PersonModule {}
