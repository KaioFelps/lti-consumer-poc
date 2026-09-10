import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { LtiLineItem, LtiScore } from "$/assignment-and-grade/entities";
import { LtiScoresRepository } from "$/assignment-and-grade/repositories";
import { LtiRepositoryError } from "$/core/errors/repository.error";

export class InMemoryLtiScoresRepository extends LtiScoresRepository {
  public scores: Array<{ score: LtiScore; lineItemId: string }> = [];

  public async findByLineItemIdAndUserId(
    lineItemId: LtiLineItem["id"],
    userId: string,
  ): Promise<Either<LtiRepositoryError, LtiScore>> {
    const row = this.scores.find(
      (row) => row.lineItemId === lineItemId.toString() && row.score.userId === userId,
    );

    if (!row) {
      const error = new LtiRepositoryError({
        type: "NotFound",
        cause: undefined,
        subject: LtiScore.name,
      });

      return e.left(error);
    }

    return e.right(row.score);
  }

  public async upsert(
    score: LtiScore,
    lineItemId: LtiLineItem["id"],
  ): Promise<Either<LtiRepositoryError, void>> {
    const newRows = this.scores.filter(
      (row) => row.score.userId !== score.userId || row.lineItemId !== lineItemId.toString(),
    );

    this.scores = [...newRows, { score, lineItemId: lineItemId.toString() }];
    return e.right(undefined);
  }
}
