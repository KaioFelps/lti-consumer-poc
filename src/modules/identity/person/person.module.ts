import { Module } from "@nestjs/common";
import { FindPersonByIdService } from "./services/find-person-by-id.service";
import { RegisterNewPersonService } from "./services/register-new-person.service";

@Module({
  providers: [RegisterNewPersonService, FindPersonByIdService],
  exports: [RegisterNewPersonService, FindPersonByIdService],
})
export class PersonModule {}
