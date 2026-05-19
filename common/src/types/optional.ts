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
 * Make every type that is union with `undefined` also optional.
 *
 * @example
 * OptionalizeUndefined<{ foo: boolean, bar: boolean | undefined }>
 * // { foo: boolean, bar?: boolean | undefined }
 */
export type OptionalizeUndefined<T> = Simplify<
  { [K in keyof T as undefined extends T[K] ? K : never]?: T[K] } & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
  }
>;

type Simplify<T> = { [K in keyof T]: T[K] } & {};
