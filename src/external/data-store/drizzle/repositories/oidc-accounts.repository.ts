import { Inject, Injectable } from "@nestjs/common";
import { usersTable } from "drizzle/schema.js";
import { and, eq, SQLWrapper, sql } from "drizzle-orm";
import { either, option, taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { tryCatch } from "fp-ts/lib/TaskEither.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory.js";
import { Person, PersonUncheckedProps } from "@/modules/identity/person/person.entity.js";
import { OIDCAccount } from "@/modules/oidc/account.js";
import { OIDCAccountsRepository } from "@/modules/oidc/repositories/accounts.repository.js";
import { trimNullProperties } from "@/utils/trim-null-properties.js";
import { DrizzleClient } from "../client.js";

/**
 * This is a repository whose interface is not defined by the application domain.
 * Thus, it's unavoidable that we throw exception under situations where we would
 * usually return error as monads.
 */
@Injectable()
export class DrizzleODICAccountsRepository extends OIDCAccountsRepository {
  @Inject()
  private readonly drizzle: DrizzleClient;

  public async findAccountById(id: string): Promise<OIDCAccount | undefined> {
    const account = await this.findAccountGivenCondition(eq(usersTable.id, id));
    return account;
  }

  public async findAccountByUsername(username: string): Promise<OIDCAccount | undefined> {
    const account = await this.findAccountGivenCondition(eq(usersTable.username, username));
    return account;
  }

  private async findAccountGivenCondition(condition: SQLWrapper) {
    const rawPersonResult = await pipe(
      tryCatch(
        () =>
          this.drizzle
            .getClient()
            .select()
            .from(usersTable)
            .limit(1)
            .where(
              and(
                sql`${[
                  usersTable.firstName,
                  usersTable.surname,
                  usersTable.cpf,
                  usersTable.birthDate,
                ]} IS NOT NULL`,
                condition,
              ),
            ),
        (error) => {
          return new IrrecoverableError(
            "An error occurred in DrizzleODICAccountsRepository on " +
              "finding an OIDC account by ID.",
            error as Error,
          );
        },
      ),
      taskEither.map((rows) => {
        if (rows.length !== 1) return option.none;
        return option.some(rows[0]);
      }),
    )();

    if (either.isLeft(rawPersonResult)) {
      throw ExceptionsFactory.fromError(rawPersonResult.left);
    }

    return pipe(
      rawPersonResult.right,
      option.map(trimNullProperties),
      option.map((person) => person as PersonUncheckedProps),
      option.map(Person.createUnchecked),
      option.map((person) => new OIDCAccount(person)),
      option.match(
        () => undefined,
        (account) => account,
      ),
    );
  }
}
