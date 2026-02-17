import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { ltiToolDeployments } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { LtiToolDeployment } from "@/modules/lti/tools/entities/lti-tool-deployment.entity";
import { LtiToolsDeploymentsRepository } from "@/modules/lti/tools/lti-tools-deployments.repository";
import { DrizzleClient } from "../client";
import mapper from "../mappers/lti-tools-deployments.mapper";
import ltiToolsDeploymentsMapper from "../mappers/lti-tools-deployments.mapper";

@Injectable()
export class DrizzleLtiToolsDeploymentsRepository extends LtiToolsDeploymentsRepository {
  @Inject()
  private readonly drizzle: DrizzleClient;

  public async save(deployment: LtiToolDeployment): Promise<Either<IrrecoverableError, void>> {
    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().insert(ltiToolDeployments).values(mapper.intoRow(deployment)),
        (error: Error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when deploying an LTI tool.`,
            error,
          ),
      ),
      te.map((_rows) => {}),
    )();
  }

  public async findManyByToolId(
    toolId: string,
  ): Promise<Either<IrrecoverableError, LtiToolDeployment[]>> {
    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiToolDeployments.findMany({
            where: eq(ltiToolDeployments.clientId, toolId),
          }),
        (error: Error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when finding many deployments by tool id.`,
            error,
          ),
      ),
      te.map((rows) => rows.map(mapper.fromRow)),
    )();
  }

  public async delete(deploymentId: UUID): Promise<Either<IrrecoverableError, void>> {
    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .delete(ltiToolDeployments)
            .where(eq(ltiToolDeployments.id, deploymentId.toString())),
        (error: Error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when deleting deployment.`,
            error,
          ),
      ),
      te.map((_result) => {}),
    )();
  }

  public async findById(
    deploymentId: UUID,
  ): Promise<Either<IrrecoverableError | ResourceNotFoundError, LtiToolDeployment>> {
    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .select({
              id: ltiToolDeployments.id,
              clientId: ltiToolDeployments.clientId,
              label: ltiToolDeployments.label,
            })
            .from(ltiToolDeployments)
            .where(eq(ltiToolDeployments.id, deploymentId.toString()))
            .limit(1),
        (error: Error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when finding deployment by id.`,
            error,
          ),
      ),
      te.map((rows) => rows[0]),
      te.chain(
        te.fromNullable(
          new ResourceNotFoundError({
            errorMessageIdentifier:
              LtiToolsDeploymentsRepository.messages.findById.resourceNotFound,
            messageParams: { deploymentId: deploymentId.toString() },
          }),
        ),
      ),
      te.map(ltiToolsDeploymentsMapper.fromRow),
    )();
  }
}
