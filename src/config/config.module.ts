import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EnvironmentVars } from "./environment-vars";
import { environmentVariablesSchema } from "./environment-vars/schema";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (vars) => environmentVariablesSchema.parse(vars),
      ignoreEnvFile: true, // we're already injecting environment variables in `main.ts`
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
