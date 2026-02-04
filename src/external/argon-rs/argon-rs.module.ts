import { Module } from "@nestjs/common";
import { PasswordComparator } from "@/modules/auth/password/comparator";
import { PasswordHasher } from "@/modules/auth/password/hasher";
import { ArgonRSPasswordHasherAndComparator } from "./hasher-and-comparator";

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
