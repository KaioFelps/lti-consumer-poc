import { Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ErrorBase } from "@/core/errors/error-base";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { TransactionManager } from "@/core/transaction-manager";
import { CreateAssignmentService } from "@/modules/assignments-and-grades/services/create-assignment.service";
import { Context } from "$/core/context";
import { LtilibError } from "$/core/errors/bases/ltilib.error";
import { unmountContextId } from "../../advantage/context";
import { FindContextByIdService } from "../../advantage/context/services/find-context-by-id.service";
import { CreateResourceLinkService } from "../../resource-links/services/create-resource-link.service";
import { LtiToolDeployment } from "../../tools/entities/lti-tool-deployment.entity";
import { LtiToolsDeploymentsRepository } from "../../tools/lti-tools-deployments.repository";
import { ToolNotDeployedError } from "../errors/tool-not-deployed.error";
import { ExternalLtiAssignmentsRepository } from "../repositories/external-lti-assignments.repository";

type Params = {
  contextComposedId: string;
  instructorId: UUID;
  toolId: string;
  assignment: {
    title: string;
    maxScore: number;
    releasedAt?: Date;
    deadline?: Date;
    courseId: UUID;
  };
  resourceLink: {
    resourceUrl?: URL;
    customParameters?: Record<string, string>;
  };
};

@Injectable()
export class CreateExternalLtiAssignmentService {
  public constructor(
    private readonly deploymentsRepository: LtiToolsDeploymentsRepository,
    private readonly transactionManager: TransactionManager,
    private readonly externalAssignmentsRepo: ExternalLtiAssignmentsRepository,
    private readonly createResourceLinkService: CreateResourceLinkService,
    private readonly createAssignmentService: CreateAssignmentService,
    private readonly findContextService: FindContextByIdService,
  ) {}

  public exec(params: Params) {
    const { toolId, contextComposedId } = params;
    return pipe(
      te.Do,
      te.apS("deployment", this.findToolDeployment(toolId, contextComposedId)),
      te.apS("context", () => this.findContextService.exec({ contextComposedId })),
      te.chainW(({ deployment, context }) =>
        this.persistAssignmentAndResourceLinkAtomically(params, deployment, context),
      ),
    )();
  }

  private persistAssignmentAndResourceLinkAtomically(
    params: Params,
    deployment: LtiToolDeployment,
    context: Context<unknown>,
  ) {
    const { assignment, instructorId, resourceLink } = params;

    const transaction = () =>
      this.transactionManager.runInTransaction(async () => {
        return pipe(
          te.Do,
          te.apS("assignment", () =>
            this.createAssignmentService.execute({ ...assignment, instructorId }),
          ),
          te.bindW(
            "resourceLink",
            () => () =>
              this.createResourceLinkService.exec({
                ...resourceLink,
                deployment,
                context,
              }),
          ),
          te.chainFirstW(
            ({ assignment, resourceLink }) =>
              () =>
                this.externalAssignmentsRepo.makeAssignmentExternal(assignment, resourceLink),
          ),
          te.mapLeft((error) => {
            throw error;
          }),
        )();
      });

    return pipe(
      te.tryCatch(transaction, (error) => {
        if (
          error instanceof IrrecoverableError ||
          error instanceof ErrorBase ||
          error instanceof LtilibError
        ) {
          return error;
        }

        return new IrrecoverableError(
          `Failed to persist assignment and resource link within transaction (in ${CreateExternalLtiAssignmentService.name}).`,
          error as Error,
        );
      }),
      te.map(te.fromEither),
      te.flatten,
    );
  }

  private findToolDeployment(toolId: string, contextComposedId: string) {
    return pipe(
      unmountContextId(contextComposedId),
      te.fromEither,
      te.chainW(
        ({ concreteEntityId, concreteType }) =>
          () =>
            this.deploymentsRepository.findMostAppropriateDeploymentForTool(
              toolId,
              concreteEntityId,
              concreteType,
            ),
      ),
      te.mapLeft((error) =>
        error instanceof ResourceNotFoundError ? new ToolNotDeployedError(toolId) : error,
      ),
    );
  }
}
