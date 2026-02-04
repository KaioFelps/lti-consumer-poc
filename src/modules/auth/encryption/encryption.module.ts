import { Module } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars";
import { AuthJwkSet } from "./jwks-set";

@Module({
  providers: [
    {
      provide: AuthJwkSet,
      useFactory: (envVars: EnvironmentVars) => AuthJwkSet.create(envVars),
      inject: [EnvironmentVars],
    },
  ],
  exports: [AuthJwkSet],
})
export class EncryptionModule {}
