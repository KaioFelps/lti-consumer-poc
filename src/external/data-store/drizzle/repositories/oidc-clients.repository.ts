import { Injectable } from "@nestjs/common";
import { ClientMetadata } from "oidc-provider";
import { OIDCClientsRepository } from "@/oidc/repositories/clients.repository";

@Injectable()
export class DrizzleOIDCClientsRepository extends OIDCClientsRepository {
  public async getClients(): Promise<ClientMetadata[]> {
    return [];
  }
}
