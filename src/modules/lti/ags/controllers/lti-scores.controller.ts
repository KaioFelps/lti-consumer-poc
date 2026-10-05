import { Body, Controller, Headers, Param, Post, Res } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { HttpResponse } from "@/lib";
import { ExtendedExceptionsFactory } from "@/lib/exceptions/extended-exceptions.factory";
import { Rest } from "@/lib/mvc-routes";
import { AuthStrategy, ConfigAuthGuard } from "@/modules/auth/protected-routes";
import { CurrentTool } from "@/modules/auth/protected-routes/decorators/current-tool";
import { type LtiToolJwtPayload } from "@/modules/auth/protected-routes/lti-tool-jwt-payload";
import { LtiScoreServices } from "$/assignment-and-grade";
import { InvalidScoreArgumentError } from "$/assignment-and-grade/errors";
import { FindContextByIdService } from "../../advantage/context/services/find-context-by-id.service";
import { FindToolByIdService } from "../../tools/services/find-tool-by-id.service";
import { ScoreDTO } from "../dtos/score.dto";
import { ContextConcreteType } from "../enums/context-concrete-type";

@Rest()
@Controller("/lti/ags/:contextId/lineitems")
export class LtiScoresController {
  public constructor(
    private readonly scoresServices: LtiScoreServices<ContextConcreteType>,
    private readonly findContextByIdService: FindContextByIdService,
    private readonly findToolByIdService: FindToolByIdService,
  ) {}

  @Post(":lineItemId/scores")
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
      te.apS("tool", () => this.findToolByIdService.exec({ id: toolId })),
      te.apS("context", () => this.findContextByIdService.exec({ contextComposedId: contextId })),
      te.chainW(
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
      te.map((scoresResponse) => {
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
