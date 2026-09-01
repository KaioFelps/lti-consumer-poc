import { Either } from "fp-ts/lib/Either";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Platform } from "$/core/platform";

export abstract class LineItemService<
  Params = unknown,
  ReturnType = unknown,
  ErrorsType = unknown,
> {
  public abstract execute(params: Params): Promise<Either<ErrorsType, ReturnType>>;
  public abstract getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined;
  public abstract getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined;
  public abstract getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined;

  protected getResolvedDates(
    config: Platform.LtiAssignmentAndGradeServicesConfig,
    startDateTime?: Date | null,
    endDateTime?: Date | null,
  ) {
    const resolvedStartDate =
      startDateTime && config.deadlinesEnabled?.start ? new Date(startDateTime) : undefined;

    const resolvedEndDate =
      endDateTime && config.deadlinesEnabled?.end ? new Date(endDateTime) : undefined;

    return { resolvedStartDate, resolvedEndDate };
  }
}
