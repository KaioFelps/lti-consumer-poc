/**
 * TODO: this should not use course at all, but a context id + context type instead
 * in order to support different contexts...
 */
import { Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";
import { TransactionManager } from "@/core/transaction-manager";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository";
import { CreateAssignmentService } from "@/modules/assignments-and-grades/services/create-assignment.service";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { CreateResourceLinkService } from "../../resource-links/services/create-resource-link.service";
import { LtiToolDeployment } from "../../tools/entities/lti-tool-deployment.entity";
import { LtiToolsDeploymentsRepository } from "../../tools/lti-tools-deployments.repository";
import { ContextConcreteType } from "../enums/context-concrete-type";
import { ToolNotDeployedError } from "../errors/tool-not-deployed.error";
import { ExternalLtiAssignmentsRepository } from "../repositories/external-lti-assignments.repository";

type Params = {
  courseId: UUID;
  instructorId: UUID;
  toolId: string;
  assignment: {
    title: string;
    maxScore: number;
    releasedAt?: Date;
    deadline?: Date;
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
    private readonly coursesRepository: CoursesRepository,
    private readonly transactionManager: TransactionManager,
    private readonly externalAssignmentsRepo: ExternalLtiAssignmentsRepository,
    private readonly createResourceLinkService: CreateResourceLinkService,
    private readonly createAssignmentService: CreateAssignmentService,
  ) {}

  public execute(params: Params) {
    const { toolId, courseId } = params;
    return pipe(
      te.Do,
      te.apS("course", () => this.coursesRepository.findById(courseId)),
      te.bindW("deployment", ({ course }) => this.findToolDeployment(toolId, course)),
      te.chainW(({ deployment }) =>
        this.persistAssignmentAndResourceLinkAtomically(params, deployment),
      ),
    )();
  }

  private persistAssignmentAndResourceLinkAtomically(
    params: Params,
    deployment: LtiToolDeployment,
  ) {
    const { assignment, instructorId, courseId, resourceLink } = params;
    return () =>
      this.transactionManager.runInTransaction(async () => {
        return pipe(
          te.Do,
          te.apS("assignment", () =>
            this.createAssignmentService.execute({ ...assignment, instructorId, courseId }),
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

  private findToolDeployment(toolId: string, course: Course) {
    return pipe(
      () =>
        this.deploymentsRepository.findMostAppropriateDeploymentForTool(
          toolId,
          course.getId().toString(),
          ContextConcreteType.Course,
        ),
      te.mapLeft((error) =>
        error instanceof ResourceNotFoundError ? new ToolNotDeployedError(toolId) : error,
      ),
    );
  }
}
