type IncludeNullIfUndefined<T> = T extends undefined ? T | undefined | null : T;

export type NullifyUndefined<T> = {
  [K in keyof T]: IncludeNullIfUndefined<T[K]>;
};
