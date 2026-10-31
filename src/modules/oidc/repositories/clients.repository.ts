import { Either } from "fp-ts/lib/Either.js";
import { ClientMetadata } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { OIDCClient } from "../client.js";

export abstract class OIDCClientsRepository {
  public abstract getClients(): Promise<Either<IrrecoverableError, OIDCClient[]>>;
  public abstract upsertClient(
    client: OIDCClient,
  ): Promise<Either<IrrecoverableError, ClientMetadata>>;
}
