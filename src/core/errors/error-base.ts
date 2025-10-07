export abstract class ErrorBase {
  /**
   * A namespaced error code that may be used by a client to find and display a
   * message string that explains this error.
   */
  public readonly errorMessageIdentifier: string;

  protected constructor(
    /**
     * A code that indicates the type of this error. May be used by
     * a client to determine the appropriate way to handle this error.
     */
    public readonly errorType: string,
  ) {}
}
