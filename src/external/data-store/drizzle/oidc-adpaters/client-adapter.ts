import { option, taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Adapter, AdapterPayload, errors } from "oidc-provider";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { OIDCServerErrorException } from "@/lib/exceptions/oidc/exception";
import { mapTaskEitherEitherAndFlatten } from "@/lib/fp-ts";
import { LtiToolIdPrefix } from "@/lti";
import { LtiTool } from "@/lti/lti-tool";
import { LTIToolsRepository } from "@/lti/lti-tools.repository";
import { ODICClientIdPrefix } from "@/oidc";
import { ModelName } from "@/oidc/adapter/factory";
import { OIDCClient } from "@/oidc/client";
import { OIDCClientsRepository } from "@/oidc/repositories/clients.repository";
import { LTI_TOOL_CONFIGURATION_KEY } from "$/registration/dynamic/tool-configuration";

// TODO: implement every method from this adapter
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
    const isLtiTool = LTI_TOOL_CONFIGURATION_KEY in payload;

    /**
     * We ensure every tool or client be prefixed according to what it its.
     * If the ID does not have the prefix, we'll assume it's a new register and the ID
     * has just been generated.
     *
     * A way better solution would be to do this inside
     * `idFactory` method from provide configuration, however the context available
     * in that callback does not have access to body (and thus to the client metadata),
     * stopping us from deciding which prefix to use.
     */
    if (!id.startsWith(LtiToolIdPrefix) && !id.startsWith(ODICClientIdPrefix)) {
      const prefix = isLtiTool ? LtiToolIdPrefix : ODICClientIdPrefix;
      id = `${prefix}${id}`;
    }

    if (id) payload.client_id = id;
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
    // const [client, tool] = Promise;
    // const key = resolveOIDCKey(id);
    // const data = await this.redis.client.json.get(key);
    // if (data) return JSON.parse(data as string);
    throw new Error("find not implemented");
  }

  public async findByUserCode(
    userCode: string,
  ): Promise<AdapterPayload | undefined> {
    // const id = await this.redis.client.get(userCodeKeyFor(userCode));
    // if (id) return await this.find(id);
    throw new Error("findByUserCode not implemented");
  }

  public async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    // const id = await this.redis.client.get(uidKeyFor(uid));
    // if (id) return await this.find(id);
    throw new Error("findByUid not implemented");
  }

  public async consume(id: string): Promise<undefined> {
    // await this.redis.client.json.set(
    //   resolveOIDCKey(id),
    //   "consumed",
    //   Math.floor(Date.now() / 1000),
    // );
    throw new Error("consume not implemented");
  }

  public async destroy(id: string): Promise<undefined> {
    // const key = resolveOIDCKey(id);
    // await this.redis.client.del(key);
    throw new Error("destroy not implemented");
  }

  public async revokeByGrantId(grantId: string): Promise<undefined> {
    //   const multi = this.redis.client.multi();

    //   const tokens = await this.redis.client.lRange(grantKeyFor(grantId), 0, -1);
    //   tokens.forEach((token) => multi.del(token));

    //   multi.del(grantKeyFor(grantId));
    //   await multi.exec();
    throw new Error("revokeByGrantId not implemented");
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
