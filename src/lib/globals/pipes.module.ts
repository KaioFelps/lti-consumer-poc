import { Module } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { CoreValidationPipe } from "../core-validation/pipe";

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: CoreValidationPipe,
    },
  ],
})
export class GlobalPipesModule {}
