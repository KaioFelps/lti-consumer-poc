import { Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";
import { PasswordComparator } from "@/modules/auth/password/comparator";
import { PasswordHasher } from "@/modules/auth/password/hasher";

@Injectable()
export class ArgonRSPasswordHasherAndComparator
  implements PasswordComparator, PasswordHasher
{
  async hash(plain: string): Promise<string> {
    return await hash(plain);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return await verify(hashed, plain);
  }
}
