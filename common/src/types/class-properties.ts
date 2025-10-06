/**
 * Extracts the properties from a class. This is useful for static constructor methods
 * that receives the properties of the class and might not want to create a separated
 * type of the class to omit the class' methods, nor take a class instance and allow
 * intellisense to suggest methods calls (even though it's a plain object and not a
 * class instance).
 *
 * # Example
 * ```ts
 * class Foo {
 *  private constructor(
 *      private myProperty: string;
 *  ) {}
 *
 *  public myPublicMethod() {
 *      // ...
 *  }
 *
 *  public static create(args: ClassProperties<Foo>): Foo {
 *      // this method cannot be called, since `ClassProperties` has omitted it:
 *      // args.myPublicMethod
 *
 *      return new Foo(args.myProperty);
 *  }
 * }
 */
export type ClassProperties<C> = {
  /**
   * biome-ignore lint/complexity/noBannedTypes: We're not interested on the
   * return type or whatever about these functions anyway
   */
  [Key in keyof C as C[Key] extends Function ? never : Key]: C[Key];
};
