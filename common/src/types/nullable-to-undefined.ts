/**
 * Maps every nullable property to undefined (e.g., `string | null` -> `string | undefined`).
 *
 * @example
 * ```typescript
 * type Post {
 *  id: string;
 *  name: string | null;
 *  email: string;
 * }
 *
 * type PostWithNullAsUndefined = NullableToUndefined<Post>;
 * // { id: string, name: string | undefined, email: string }
 * ```
 **/
export type NullableToUndefined<T> = {
  [K in keyof T]: null extends T[K] ? Exclude<T[K], null> | undefined : T[K];
};
