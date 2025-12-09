/**
 * Some of these methods does not need to be implemented, since they are not to be called
 * when managing OIDC Clients and LTI Tools.
 */

import { either, option, taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Adapter, AdapterPayload, errors } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { OIDCServerErrorException } from "@/lib/exceptions/oidc/exception";
import {
  eitherPromiseToTaskEither,
  mapTaskEitherEitherAndFlatten,
} from "@/lib/fp-ts";
import { LtiToolIdPrefix } from "@/lti";
import { LtiTool } from "@/lti/lti-tool";
import { LTIToolsRepository } from "@/lti/lti-tools.repository";
import { ModelName } from "@/oidc/adapter/factory";
import { OIDCClient } from "@/oidc/client";
import { OIDCClientsRepository } from "@/oidc/repositories/clients.repository";

export class DrizzleOIDCClientAdapter implements Adapter {
  public constructor(
    name: ModelName,
    private readonly clientRepository: OIDCClientsRepository,
    private readonly toolsRepository: LTIToolsRepository,
  ) {
    if (name !== "Client") {
      throw new IrrecoverableError(
        `Tried to instantiate a \`${DrizzleOIDCClientAdapter.name}\` for model ${name}.`,
      );
    }
  }

  public async upsert(
    id: string,
    payload: AdapterPayload,
    _expiresIn: number,
  ): Promise<undefined> {
    const isLtiTool = id.startsWith(LtiToolIdPrefix);
    payload.client_id = id;

    if (isLtiTool) {
      await pipe(
        LtiTool.tryCreateFromClientMetadata(payload),
        taskEither.fromEither,
        mapTaskEitherEitherAndFlatten((tool) =>
          this.toolsRepository.upsertTool(tool),
        ),
        taskEither.mapError(handleUpsertErrors),
      )();

      return;
    }

    await pipe(
      OIDCClient.tryCreateFromMetadata(payload),
      taskEither.fromEither,
      mapTaskEitherEitherAndFlatten((metadata) =>
        this.clientRepository.upsertClient(metadata),
      ),
      taskEither.mapError(handleUpsertErrors),
    )();
  }

  public async find(id: string): Promise<AdapterPayload | undefined> {
    if (id.startsWith(LtiToolIdPrefix)) {
      return await pipe(
        eitherPromiseToTaskEither(() => this.toolsRepository.findToolById(id)),
        taskEither.match(
          (err) => {
            if (err instanceof IrrecoverableError) return either.left(err);
            return either.right(option.none);
          },
          (tool) => either.right(option.some(tool)),
        ),
        taskEither.map((tool) =>
          pipe(
            tool,
            option.match(
              () => undefined,
              (tool) => tool.asClientMetadata(),
            ),
          ),
        ),
        taskEither.match(
          (err) => {
            console.error(err);
            throw new OIDCServerErrorException();
          },
          (tool) => tool,
        ),
      )();
    }
  }

  public async findByUserCode(
    _userCode: string,
  ): Promise<AdapterPayload | undefined> {
    throw new Error(
      `findByUserCode not implemented for ${DrizzleOIDCClientAdapter.name}`,
    );
  }

  public async findByUid(_uid: string): Promise<AdapterPayload | undefined> {
    throw new Error(
      `findByUid not implemented for ${DrizzleOIDCClientAdapter.name}`,
    );
  }

  public async consume(_id: string): Promise<undefined> {
    throw new Error(
      `consume not implemented for ${DrizzleOIDCClientAdapter.name}`,
    );
  }

  public async destroy(id: string): Promise<undefined> {
    const deleteResult = await this.toolsRepository.deleteToolById(id);
    if (either.isLeft(deleteResult)) {
      console.error(deleteResult.left);
      throw new OIDCServerErrorException();
    }
  }

  public async revokeByGrantId(_grantId: string): Promise<undefined> {
    throw new Error(
      `revokeByGrantId not implemented for ${DrizzleOIDCClientAdapter.name}`,
    );
  }
}

function handleUpsertErrors(err: IrrecoverableError | ValidationErrors) {
  if (err instanceof ValidationErrors) {
    const firstValidationErr = err.pickFirstError();
    if (option.isSome(firstValidationErr)) {
      const [field, error] = firstValidationErr.value;
      throw new errors.InvalidClientMetadata(
        /**
         * The Lti tool configuration schema used within `LtiTool` entity
         * doesn't apply to message strings, but return zod error messages
         * directly.
         */
        `${field}: ${error.errorMessageIdentifier}`,
      );
    }

    console.error(
      "Failed to pick first error from validation errors within OIDC client adapter",
      err,
    );
  }

  if (err instanceof IrrecoverableError) {
    console.error(err);
  }

  throw new OIDCServerErrorException();
}
