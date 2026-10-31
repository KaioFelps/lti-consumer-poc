import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { environmentVariablesSchema } from "./environment-vars/schema.js";
import { EnvironmentVars } from "./environment-vars.js";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (vars) => environmentVariablesSchema.parse(vars),
    }),
  ],
  exports: [EnvironmentVars],
  providers: [
    {
      provide: EnvironmentVars,
      useFactory: EnvironmentVars.create,
      inject: [ConfigService],
    },
  ],
})
export class AppConfigModule {}
