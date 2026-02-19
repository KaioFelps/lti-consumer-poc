/**
 * Make some property from a type optional by key.
 *
 * @example
 * ```typescript
 * type Post {
 *  id: string;
 *  name: string;
 *  email: string;
 * }
 *
 * Optional<Post, 'id' | 'email'>
 * ```
 **/

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * Make every property from `T` optional.
 */
export type AllOptional<T> = {
  [K in keyof T]?: T[K] | undefined;
};
