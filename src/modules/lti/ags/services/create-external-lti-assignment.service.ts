import { Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { TransactionManager } from "@/core/transaction-manager";
import { CreateAssignmentService } from "@/modules/assignments-and-grades/services/create-assignment.service";
import { unmountContextId } from "../../advantage/context";
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
  ) {}

  public exec(params: Params) {
    const { toolId, contextComposedId } = params;
    return pipe(
      te.Do,
      te.bindW("deployment", () => this.findToolDeployment(toolId, contextComposedId)),
      te.chainW(({ deployment }) =>
        this.persistAssignmentAndResourceLinkAtomically(params, deployment),
      ),
    )();
  }

  private persistAssignmentAndResourceLinkAtomically(
    params: Params,
    deployment: LtiToolDeployment,
  ) {
    const { assignment, instructorId, resourceLink } = params;
    return () =>
      this.transactionManager.runInTransaction(async () => {
        return pipe(
          te.Do,
          te.apS("assignment", () =>
            this.createAssignmentService.execute({ ...assignment, instructorId }),
          ),
          te.bindW(
            "resourceLink",
            () => () => this.createResourceLinkService.exec({ ...resourceLink, deployment }),
          ),
          te.chainFirstW(
            ({ assignment, resourceLink }) =>
              () =>
                this.externalAssignmentsRepo.makeAssignmentExternal(assignment, resourceLink),
          ),
          te.mapLeft((error) => {
            this.transactionManager.rollback();
            return error;
          }),
        )();
      });
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
