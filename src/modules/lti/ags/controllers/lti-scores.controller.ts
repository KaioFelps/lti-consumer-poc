import { Body, Controller, Headers, Param, Post, Res, Sse, SseSignal } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { EMPTY, finalize, Observable } from "rxjs";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { ExtendedExceptionsFactory } from "@/lib/exceptions/extended-exceptions.factory.js";
import { Mvc, Rest } from "@/lib/mvc-routes.js";
import type { HttpResponse } from "@/lib.js";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity.js";
import { CurrentTool } from "@/modules/auth/protected-routes/decorators/current-tool.js";
import { type LtiToolJwtPayload } from "@/modules/auth/protected-routes/lti-tool-jwt-payload.js";
import { AuthStrategy, ConfigAuthGuard } from "@/modules/auth/protected-routes.js";
import { SessionUser } from "@/modules/auth/session-user.js";
import { User } from "@/modules/identity/user/user.entity.js";
import { LtiScore } from "$/assignment-and-grade/entities/index.js";
import { InvalidScoreArgumentError } from "$/assignment-and-grade/errors.js";
import { LtiScoreServices } from "$/assignment-and-grade.js";
import { FindContextByIdService } from "../../advantage/context/services/find-context-by-id.service.js";
import { IncomingScoreEvent } from "../../grade-sync/incoming-score.event.js";
import { SseConnectionsService } from "../../grade-sync/services/sse-connections.service.js";
import { SyncLtiAssignmentGradeService } from "../../grade-sync/services/sync-lti-assignment-grade.service.js";
import { FindToolByIdService } from "../../tools/services/find-tool-by-id.service.js";
import { ScoreDTO } from "../dtos/score.dto.js";
import { ContextConcreteType } from "../enums/context-concrete-type.js";
import { ExternalLtiAssignmentsRepository } from "../repositories/external-lti-assignments.repository.js";

@Controller("/lti/ags/:contextId")
export class LtiScoresController {
  public constructor(
    private readonly scoresServices: LtiScoreServices<ContextConcreteType>,
    private readonly findContextByIdService: FindContextByIdService,
    private readonly findToolByIdService: FindToolByIdService,
    private readonly syncGradeService: SyncLtiAssignmentGradeService,
    private readonly sseConnections: SseConnectionsService,
    private readonly externalAssignmentsRepo: ExternalLtiAssignmentsRepository,
  ) {}

  @Rest()
  @Post("lineitems/:lineItemId/scores")
  @ConfigAuthGuard({ strategy: AuthStrategy.LtiToolsJwt })
  public createLineItem(
    @Headers("accept") acceptHeader: string | undefined,
    @Headers("content-type") contentTypeHeader: string | undefined,
    @Body() body: ScoreDTO,
    @CurrentTool() { sub: toolId }: LtiToolJwtPayload,
    @Param("contextId") contextId: string,
    @Param("lineItemId") lineItemId: string,
    @Res() response: HttpResponse,
  ) {
    return pipe(
      te.Do,
      te.apSW("tool", () => this.findToolByIdService.exec({ id: toolId })),
      te.apSW("context", () => this.findContextByIdService.exec({ contextComposedId: contextId })),
      te.apSW("assignment", () =>
        pipe(
          () => this.externalAssignmentsRepo.findExternalLtiAssignmentByLineItemId(lineItemId),
          te.orElseW((error) =>
            error instanceof IrrecoverableError ? te.left(error) : te.right(undefined),
          ),
        )(),
      ),
      te.bindW(
        "scoresResponse",
        ({ tool, context }) =>
          () =>
            this.scoresServices.publish({
              ...body,
              acceptHeader,
              contentTypeHeader,
              context,
              tool: tool.record,
              lineItemId,
            }),
      ),
      te.tapTask(({ scoresResponse, assignment }) => async () => {
        if (assignment) this.silentlyEnqueueGradeSyncJob(assignment, scoresResponse.rawContent);
      }),
      te.map(({ scoresResponse }) => {
        response
          .setHeaders(scoresResponse.headers)
          .status(scoresResponse.httpStatusCode)
          .send(scoresResponse.content);
      }),
      te.mapLeft((error) => {
        throw ExtendedExceptionsFactory.fromError(resolveTimestampsErrors(error));
      }),
    )();
  }

  @Mvc()
  @Sse(":assignmentId/stream")
  stream(
    @Param("assignmentId") assignmentId: string,
    @SessionUser() student: User,
    @SseSignal() signal: AbortSignal,
  ): Observable<MessageEvent> {
    if (signal.aborted) return EMPTY;

    const subject = this.sseConnections.register(assignmentId, student.getId().toString());
    const userId = student.getId().toString();

    return subject.pipe(
      finalize(() => this.sseConnections.unregister(assignmentId, userId, subject)),
    );
  }

  private silentlyEnqueueGradeSyncJob(assignment: Readonly<Assignment>, score: Readonly<LtiScore>) {
    const isNewGradeUpdate = [
      LtiScore.GradingProgress.FullyGraded,
      LtiScore.GradingProgress.PendingManual,
    ].includes(score.gradingProgress);

    const lastUpdatedAt = isNewGradeUpdate
      ? new Date(score.submission?.submittedAt ?? score.timestamp).toISOString()
      : undefined;

    this.syncGradeService.sync(
      new IncomingScoreEvent(
        assignment.getId().toString(),
        score.userId,
        score.activityProgress,
        score.gradingProgress,
        score.score,
        lastUpdatedAt,
      ),
    );
  }
}

/**
 * Simple mapper to get the correct message string identifier related to the
 * timestamp error. This is needed cuz timestamps were left to be validated
 * by ltilib rather than in the `ScoreDTO`.
 */
function resolveTimestampsErrors<T>(error: T) {
  const fieldsToHandleErrors = [
    "timestamp",
    "submission.startedAt",
    "submission.submittedAt",
  ] as const as InvalidScoreArgumentError.Fields[];

  type MessageKeys = {
    [K in InvalidScoreArgumentError.Fields]: `${K}.${InvalidScoreArgumentError.Codes[K][number]}`;
  }[InvalidScoreArgumentError.Fields];

  const timestampFields = ["submission.startedAt", "submission.submittedAt", "timestamp"] as const;

  const commonIssues = {
    invalid_datetime: "lti:ags:publish-score:submission-timestamps-must-be-iso8601",
    missing_subsecond_precision:
      "lti:ags:publish-score:submission-timestamps-must-have-subsecond-precision",
    missing_timezone_designator:
      "lti:ags:publish-score:submission-timestamps-must-have-timezone-designator",
  } as const;

  // generates a `commonIssue` key-value pair for each `timestampFields`
  const genericIdentifiers = timestampFields.flatMap((field) =>
    Object.entries(commonIssues).map(([issue, identifier]) => [`${field}.${issue}`, identifier]),
  );

  const identifiers = {
    ...Object.fromEntries(genericIdentifiers),
    // specific identifiers
    "submission.submittedAt.must_be_after_started_at":
      "lti:ags:publish-score:submission-submitted-at-must-be-after-started-at",
    "timestamp.outdated": "lti:ags:publish-score:submission-timestamp-is-outdated",
  } as const as Record<MessageKeys, string>;

  if (error instanceof InvalidScoreArgumentError && fieldsToHandleErrors.includes(error.field)) {
    const errorMessageIdentifier = identifiers[`${error.field}.${error.reason}`];

    if (!errorMessageIdentifier) {
      return new IrrecoverableError(
        "Tried to use a identifier that hasn't been defined in LTI AGS score publishment endpoint.",
      );
    }

    return new InvalidArgumentError({
      errorMessageIdentifier,
      argumentName: error.field,
    });
  }

  return error;
}
