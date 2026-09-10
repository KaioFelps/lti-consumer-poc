import { Either } from "fp-ts/lib/Either";
import { LtiRepositoryError } from "$/core/errors/repository.error";
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
   * - It must override every field. Fields that became `undefined` or `null` must be set as
   * is in the datastore.
   *
   * @note ltilib manages the lifecycle of `Score`s as per by AGS specs, so fields that must
   * be erased or updated due to incoming scores have already been at this point.
   *
   * @param score - The `score` being created or updated in the datastore.
   * @param lineItemId - The ID of the line item to which `score` is associated.
   */
  public abstract upsert(
    score: LtiScore,
    lineItemId: LtiLineItem["id"],
  ): Promise<Either<LtiRepositoryError, void>>;
}
