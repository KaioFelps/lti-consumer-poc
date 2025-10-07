export interface IntoPlainObject<T = Record<string, unknown>> {
  /**
   * Transform this class into a plain Javascript Object.
   */
  intoPlainObject(): T;
}
