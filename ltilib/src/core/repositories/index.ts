export type LtiRepositoryPaginatedResponse<T> = {
  /**
   * A subset of the elements available in the datastore, usually limited
   * by pagination filters.
   */
  values: T[];
  /**
   * The total amount of elements available in the datastore.
   */
  count: number;
};
