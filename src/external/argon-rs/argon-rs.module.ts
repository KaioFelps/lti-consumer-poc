import { Module } from "@nestjs/common";
import { PasswordComparator } from "@/modules/auth/password/comparator.js";
import { PasswordHasher } from "@/modules/auth/password/hasher.js";
import { ArgonRSPasswordHasherAndComparator } from "./hasher-and-comparator.js";

@Module({
  providers: [
    {
      provide: PasswordHasher,
      useClass: ArgonRSPasswordHasherAndComparator,
    },
    {
      provide: PasswordComparator,
      useClass: ArgonRSPasswordHasherAndComparator,
    },
  ],
  exports: [PasswordHasher, PasswordComparator],
})
export class ArgonRSModule {}
