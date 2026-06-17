/**
 * Don't make the methods names pretty. They're supposed
 * to be ugly to enforce they shall not be used unless really needed
 * (in e2e tests). Indeed, do uglify them as much as you can.
 */

import { Injectable } from "@nestjs/common";
import { ClientMetadata } from "oidc-provider";
import { EnvironmentVars } from "@/config/environment-vars";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";

/**
 * A container of mocked, unsafe, and unregisted OIDC clients metadatas.
 * This is useful for end-to-end tests that deals with node-oidc-provider
 * Authorization Server, since it's not trivial to have a real ODIC client
 * (or worse, LTI tool) running in a docker container with test containers
 * or something like this. This is easier.
 */
@Injectable()
export class UnsafeOIDCClientsInjectionContainer {
  public constructor(private readonly environments: EnvironmentVars) {}

  private clientsUnsafeCache: ClientMetadata[] = [];

  /**
   * Injects a (potentially mocked and insecure) OIDC client to
   * the clients cache used by `oidc-provider`. The provider hits
   * this cache before fetching the client in the real datastore
   * through its adapters.
   *
   * @note Only use this on testing environments.
   * It will through internal server error otherwise.
   *
   * @internal
   */
  public __pushClientMetadataToUnsafeCache(clientMetadata: ClientMetadata) {
    if (this.environments.nodeEnv !== "test") {
      throw ExceptionsFactory.fromError(
        new IrrecoverableError(
          "Tried to inject a client metadata directly via cache not in test environment.",
          undefined,
        ),
      );
    }

    this.clientsUnsafeCache.push(clientMetadata);
  }

  /**
   * Finds a cilent metadata from unsafe cache (potentially mocked and unregistered).
   *
   * @note It's supposed to be used in tests environment only.
   *
   * @internal
   */
  public __findClientMetadataFromUnsafeCache(id: string) {
    if (this.environments.nodeEnv !== "test") {
      throw ExceptionsFactory.fromError(
        new IrrecoverableError(
          "Tried to find a client metadata directly via unsafe cache in a non-test environment.",
          undefined,
        ),
      );
    }

    return this.clientsUnsafeCache.find((metadata) => metadata.client_id === id);
  }
}
