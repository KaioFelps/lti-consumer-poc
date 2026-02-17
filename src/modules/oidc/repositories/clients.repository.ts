import { Either } from "fp-ts/lib/Either";
import { ClientMetadata } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { OIDCClient } from "../client";

export abstract class OIDCClientsRepository {
  public abstract getClients(): Promise<Either<IrrecoverableError, OIDCClient[]>>;
  public abstract upsertClient(
    client: OIDCClient,
  ): Promise<Either<IrrecoverableError, ClientMetadata>>;
}
