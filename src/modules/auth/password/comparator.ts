export abstract class PasswordComparator {
  abstract compare(plain: string, hashed: string): Promise<boolean>;
}
