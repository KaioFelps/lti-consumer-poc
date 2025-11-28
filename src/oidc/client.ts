import { ClassProperties } from "common/src/types/class-properties";
import { generateUUID } from "common/src/types/uuid";
import { either } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import type { AllClientMetadata, ClientMetadata } from "oidc-provider";
import type { ZodError } from "zod";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";
import { ODICClientIdPrefix } from ".";
import { clientConfigurationSchema } from "./schemas";

type OIDCClientArgs = ClassProperties<OIDCClient>;

export class OIDCClient {
  public readonly id: string;
  public readonly applicationType: ClientMetadata["application_type"];
  public name: string;
  public uris: {
    redirect: string[];
    jwks?: string;
  };
  /**
   * A space separated list of scopes
   */
  public scope: string;
  public clientSecret?: string;

  protected constructor(args: OIDCClientArgs) {
    Object.assign(this, args);
  }

  public static create(data: Omit<OIDCClientArgs, "id">) {
    if (!data.uris.jwks && !data.clientSecret) {
      return either.left(
        new InvalidArgumentError({
          errorMessageIdentifier: "oidc:client:create:jwks-or-secret-required",
          argumentName: "clientSecret",
        }),
      );
    }

    return new OIDCClient({
      id: `${ODICClientIdPrefix}${generateUUID()}`,
      ...data,
    });
  }

  public static tryCreateFromMetadata(metadata: AllClientMetadata) {
    return pipe(
      either.tryCatch(
        () => clientConfigurationSchema.parse(metadata),
        (err) => mapZodErrorsToCoreValidationErrors(err as ZodError),
      ),
      either.map((data) => {
        return data as typeof data & { client_id: string };
      }),
      either.map(
        (metadata) =>
          new OIDCClient({
            id: metadata.client_id,
            applicationType: metadata.application_type,
            name: metadata.client_name,
            scope: metadata.scope,
            uris: {
              redirect: metadata.redirect_uris,
              jwks: metadata.jwks_uri,
            },
          }),
      ),
    );
  }

  public static createUnchecked(data: OIDCClientArgs) {
    return new OIDCClient(data);
  }

  asMetadata(): ClientMetadata {
    return {
      client_id: this.id.toString(),
      application_type: this.applicationType,
      client_name: this.name,
      scope: this.scope,
      redirect_uris: this.uris.redirect,
      jwks_uri: this.uris.jwks,
      client_secret: this.clientSecret,
    } satisfies ClientMetadata;
  }
}
