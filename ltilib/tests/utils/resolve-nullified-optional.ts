/**
 * Resolves an entry of some factory method of type `T | undefined | null` to
 * `T | undefined`. Useful when some of the fields are optional and null coalescing
 * is not enough (since it overrides both `null` and `undefined`).
 *
 * @param currentValue
 * @param defaultValue
 * @returns
 */
export function resolveFactoryOptional<T, A = Exclude<T, null>>(
  currentValue: T,
  defaultValue: A | (() => A),
): A | undefined {
  if (currentValue === null) return undefined;
  if (currentValue !== undefined) return currentValue as A;
  if (typeof defaultValue !== "function") return defaultValue;
  return (defaultValue as () => A)();
}
