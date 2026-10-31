import { OIDCAccount } from "../account.js";

export abstract class OIDCAccountsRepository {
  public abstract findAccountById(id: string): Promise<OIDCAccount | undefined>;
  public abstract findAccountByUsername(username: string): Promise<OIDCAccount | undefined>;
}
