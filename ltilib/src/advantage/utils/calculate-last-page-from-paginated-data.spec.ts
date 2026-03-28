import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { calculateLastPageFromPaginatedData } from "./calculate-last-page-from-paginated-data";

describe("Calculate Last Page From Paginated Data", () => {
  it.each([
    { count: 20, limit: 10, lastPage: 2 },
    { count: 21, limit: 10, lastPage: 3 },
  ])(
    "should correctly calculate the 'last' page as a multiple of the limit",
    ({ count, lastPage, limit }) => {
      const paginatedData = {
        count,
        values: [],
      } satisfies LtiRepositoryPaginatedResponse<unknown>;

      expect(calculateLastPageFromPaginatedData(paginatedData, limit)).toBe(lastPage);
    },
  );

  it("should point 1 as last page when count is 0", () => {
    const paginatedData = {
      count: 0,
      values: [],
    } satisfies LtiRepositoryPaginatedResponse<unknown>;
    expect(calculateLastPageFromPaginatedData(paginatedData, 10)).toBe(1);
  });
});
