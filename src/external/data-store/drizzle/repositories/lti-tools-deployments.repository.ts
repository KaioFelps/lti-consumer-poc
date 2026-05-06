import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { ltiToolDeployments } from "drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type";
import { LtiToolDeployment } from "@/modules/lti/tools/entities/lti-tool-deployment.entity";
import { DeploymentNotFoundError } from "@/modules/lti/tools/errors/deployment-not-found.error";
import { LtiToolsDeploymentsRepository } from "@/modules/lti/tools/lti-tools-deployments.repository";
import { DrizzleClient } from "../client";
import mapper, { type LtiToolDeploymentRow } from "../mappers/lti-tools-deployments.mapper";
import { DrizzleTransactionManager } from "../transaction-manager";

@Injectable()
export class DrizzleLtiToolsDeploymentsRepository extends LtiToolsDeploymentsRepository {
  @Inject()
  private readonly drizzle!: DrizzleClient;

  @Inject()
  private readonly txManager!: DrizzleTransactionManager;

  public save(deployment: LtiToolDeployment): Promise<Either<IrrecoverableError, void>> {
    return pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().insert(ltiToolDeployments).values(mapper.intoRow(deployment)),
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when deploying an LTI tool.`,
            error as Error,
          ),
      ),
      te.map((_rows) => {}),
    )();
  }

  public findManyByToolId(
    toolId: string,
  ): Promise<Either<IrrecoverableError, LtiToolDeployment[]>> {
    return pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().query.ltiToolDeployments.findMany({
            where: eq(ltiToolDeployments.clientId, toolId),
          }),
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when finding many deployments by tool id.`,
            error as Error,
          ),
      ),
      te.map((rows) => rows.map(mapper.fromRow)),
    )();
  }

  public delete(deploymentId: UUID): Promise<Either<IrrecoverableError, void>> {
    return pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .delete(ltiToolDeployments)
            .where(eq(ltiToolDeployments.id, deploymentId.toString())),
        (error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when deleting deployment.`,
            error as Error,
          ),
      ),
      te.map((_result) => {}),
    )();
  }

  public findById(deploymentId: UUID) {
    return pipe(
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
        (error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when finding deployment by id.`,
            error as Error,
          ),
      ),
      te.map((rows) => rows[0]),
      te.chainW(
        te.fromNullable(new DeploymentNotFoundError({ deploymentId: deploymentId.toString() })),
      ),
      te.map((a) => mapper.fromRow(a)),
    )();
  }

  public findMostAppropriateDeploymentForTool(
    toolId: string,
    contextConcreteId: string,
    contextConcreteType: ContextConcreteType,
  ): Promise<Either<IrrecoverableError | ResourceNotFoundError, LtiToolDeployment>> {
    const client = this.txManager.getTx() ?? this.drizzle.getClient();
    this.drizzle.getClient();

    const query = sql`
    WITH RECURSIVE context_path AS (
        SELECT 
            concrete_context_id, 
            concrete_context_type, 
            parent_context_id, 
            parent_context_type, 
            1 as depth
        FROM lti_context
        WHERE concrete_context_id = ${contextConcreteId} 
          AND concrete_context_type = ${contextConcreteType.toString()}

        UNION ALL

        SELECT 
            c.concrete_context_id, 
            c.concrete_context_type, 
            c.parent_context_id, 
            c.parent_context_type, 
            cp.depth + 1
        FROM lti_context c
        INNER JOIN context_path cp ON 
            c.concrete_context_id = cp.parent_context_id AND 
            c.concrete_context_type = cp.parent_context_type
    )

    SELECT
      d.client_id as "clientId",
      d.id as "id",
      d.label as "label"
    FROM lti_deployments d
    JOIN context_path cp ON 
        d.context_id = cp.concrete_context_id AND 
        d.context_concrete_type = cp.concrete_context_type
    WHERE d.client_id = ${toolId}
    ORDER BY cp.depth ASC
    LIMIT 1;
  `;

    return pipe(
      te.tryCatch(
        async () => {
          const result = await client.execute(query);

          if (result.rows.length === 0) {
            throw new DeploymentNotFoundError({ toolId });
          }

          const row = result.rows[0] as LtiToolDeploymentRow;
          return mapper.fromRow(row);
        },
        (error) =>
          error instanceof ResourceNotFoundError
            ? error
            : new IrrecoverableError(
                `Error occurred in ${DrizzleLtiToolsDeploymentsRepository.name} when finding the most appropriate ` +
                  `deployments for the tool of id '${toolId}'.`,
                error as Error,
              ),
      ),
    )();
  }
}
