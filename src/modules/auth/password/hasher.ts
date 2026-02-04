export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
}
