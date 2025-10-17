import { Module } from "@nestjs/common";
import { RegisterNewPersonService } from "./services/register-new-person.service";

@Module({
  providers: [RegisterNewPersonService],
  exports: [RegisterNewPersonService],
})
export class PersonModule {}
