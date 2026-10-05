import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { LtiLineItem, LtiScore } from "../entities";

export abstract class LtiScoresRepository {
  /**
   * Finds an existing instance of `Score` in the datastore.
   *
   * - If there is no `score` associated to the line item (identified by `lineItemId`),
   * a `LtiRepositoryError` of type `NotFound` must be returned.
   *
   * @param lineItemId - The ID of the line item to which the `score` being searched must be associated.
   * @param userId - The ID of the user/student to which the `score` being searched must be associated.
   */
  public abstract findByLineItemIdAndUserId(
    lineItemId: LtiLineItem["id"],
    userId: string,
  ): Promise<Either<LtiRepositoryError, LtiScore>>;

  /**
   * Saves or updates `score` in the datastore.
   *
   * - It **must** override every field. Fields that became `undefined` or `null` must be set as
   * is in the datastore.
   * - It **may** not to save `score` if {@link LtiScore.gradingProgress `score.gradingProgress`} is not
   * {@link LtiScore.GradingProgress.FullyGraded `FullyGraded`}.
   *
   * @param score - The `score` being created or updated in the datastore.
   * @param lineItemId - The ID of the line item to which `score` is associated.
   *
   * @note ltilib manages the lifecycle of `Score`s as per by AGS specs, so fields that must
   * be erased or updated due to incoming scores have already been at this point. Therefore, fields
   * set to `undefined` must be unset in the underlying datastore.
   */
  public abstract upsert(
    score: LtiScore,
    lineItemId: LtiLineItem["id"],
  ): Promise<Either<LtiRepositoryError, void>>;

  /**
   * Fetches a collection of {@link LtiScore `LtiScore`s} that belong to `lineItemId`.
   *
   * - It **must** ensure every returned score has `lineItemId`, i.e., belong to the specified line item.
   * - If no score is found, a {@link LtiRepositoryPaginatedResponse `LtiRepositoryPaginatedResponse`}
   * with empty set of items and a count set to `0` should be returned rather than a `NotFound`-type
   * {@link LtiRepositoryError `LtiRepositoryError`}.
   * - It should not return scores that have no {@link LtiScore.score `score.given`} (i.e., it is
   * `undefined` or `null`).(Returning these might cause pagination mismatches, since the total count
   * of scores might be different from the actual number of scores returned once the results service
   * — that relies on this method — will perform a security filter against unscored records.)
   *
   * @param lineItemId - The identifier of the line item to which every `score` returned must belong.
   * @param limit - The maximum amount of line items that must be returned in the current page.
   * @param page - The current (1-based indexing) page.
   */
  public abstract fetchManyByLineItemId(
    lineItemId: LtiLineItem["id"],
    limit: number,
    page: number,
  ): Promise<Either<LtiRepositoryError, LtiRepositoryPaginatedResponse<LtiScore>>>;
}
