import { NullableToUndefined } from "common/src/types/nullable-to-undefined";

export function trimNullProperties<T extends Record<PropertyKey, unknown>>(
  property: T,
): NullableToUndefined<T> {
  const record = Object.entries(property).reduce((obj, [key, value]) => {
    if (value === null) return;
    obj[key] = value;
    return obj;
  }, {});

  return (record ?? {}) as NullableToUndefined<T>;
}
