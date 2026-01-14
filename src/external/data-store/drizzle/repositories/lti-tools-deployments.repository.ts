import { Inject, Injectable } from "@nestjs/common";
import { ltiToolDeployments } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiToolDeployment } from "@/lti/tools/entities/lti-tool-deployment.entity";
import { LtiToolsDeploymentsRepository } from "@/lti/tools/lti-tools-deployments.repository";
import { DrizzleClient } from "../client";
import mapper from "../mappers/lti-tools-deployments.mapper";

@Injectable()
export class DrizzleLtiToolsDeploymentsRepository extends LtiToolsDeploymentsRepository {
  @Inject()
  private readonly drizzle: DrizzleClient;

  public async save(
    deployment: LtiToolDeployment,
  ): Promise<Either<IrrecoverableError, void>> {
    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .insert(ltiToolDeployments)
            .values(mapper.intoRow(deployment)),
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
}
