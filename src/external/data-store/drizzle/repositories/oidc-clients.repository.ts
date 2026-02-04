import { Injectable } from "@nestjs/common";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { ClientMetadata } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { OIDCClient } from "@/modules/oidc/client";
import { OIDCClientsRepository } from "@/modules/oidc/repositories/clients.repository";

@Injectable()
export class DrizzleOIDCClientsRepository extends OIDCClientsRepository {
  public async getClients(): Promise<Either<IrrecoverableError, OIDCClient[]>> {
    console.warn("get clients not implemented");
    return either.right([]);
  }

  public async upsertClient(
    _client: OIDCClient,
  ): Promise<Either<IrrecoverableError, ClientMetadata>> {
    throw new Error("upsertClient not implemented.");
  }
}
