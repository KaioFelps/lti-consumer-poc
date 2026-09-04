import { Either } from "fp-ts/lib/Either";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { AGServiceBase, AGServicesExecutor } from "..";

class CreateService extends AGServiceBase {
  public execute(params: unknown): Promise<Either<unknown, unknown>> {
    throw new Error("Method not implemented.");
  }

  public getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return [AssignmentAndGradeServiceScopes.Score];
  }

  public getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }

  public getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return LtiAdvantageMediaType.Score;
  }
}

export class ScoreServices extends AGServicesExecutor {}
