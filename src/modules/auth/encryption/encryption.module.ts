import { Module } from "@nestjs/common";
import { EnvironmentVars } from "@/config/environment-vars.js";
import { AuthJwkSet } from "./jwks-set.js";

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
