import { LtiRepositoryPaginatedResponse } from "$/core/repositories";

export function calculateLastPageFromPaginatedData(
  paginatedData: LtiRepositoryPaginatedResponse<unknown>,
  limit: number,
) {
  return Math.max(1, Math.ceil(paginatedData.count / limit));
}
