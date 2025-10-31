import { Injectable } from "@nestjs/common";
import { OIDCAccount } from "@/oidc/account";
import { OIDCAccountsRepository } from "@/oidc/repositories/accounts.repository";

@Injectable()
export class DrizzleODICAccountsRepository extends OIDCAccountsRepository {
  public findAccountById(id: string): Promise<OIDCAccount | undefined> {
    throw new Error("Method not implemented.");
  }
  public findAccountByUsername(
    username: string,
  ): Promise<OIDCAccount | undefined> {
    throw new Error("Method not implemented.");
  }
}
