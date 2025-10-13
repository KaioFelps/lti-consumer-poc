type NullableProperties<T> = {
  [P in keyof T]: T[P] | null;
};

/**
 * Make some property from a type nullable by key.
 *
 * @example
 * ```typescript
 * type Post {
 *  id: string;
 *  name: string;
 *  email: string;
 * }
 *
 * Nullable<Post, 'id' | 'email'>
 * ```
 **/
export type Nullable<T, K extends keyof T> = Pick<NullableProperties<T>, K> &
  Omit<T, K>;
