import { ClientMetadata } from "oidc-provider";

export abstract class OIDCClientsRepository {
  public abstract getClients(): Promise<ClientMetadata[]>;
}
