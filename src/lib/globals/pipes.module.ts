import { Module } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import coreValidation from "../core-validation";

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: coreValidation.Pipe,
    },
  ],
})
export class GlobalPipesModule {}
