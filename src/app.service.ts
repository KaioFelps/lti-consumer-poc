import { Injectable } from "@nestjs/common";
import { usersTable } from "drizzle/schema";
import { sql } from "drizzle-orm";
import { Person, PersonUncheckedProps } from "@/modules/identity/person/person.entity";
import { User } from "@/modules/identity/user/user.entity";
import { DrizzleClient } from "./external/data-store/drizzle/client";
import { trimNullProperties } from "./utils/trim-null-properties";

@Injectable()
export class AppService {
  public constructor(private drizzle: DrizzleClient) {}

  async getUsers(): Promise<User[]> {
    const rawUser = await this.drizzle.getClient().select().from(usersTable).execute();

    const users = rawUser.map(User.createUnchecked);
    return users;
  }

  async getPersons() {
    return (
      this.drizzle
        .getClient()
        .select()
        .from(usersTable)
        // ensure only valid person are fetched from database
        .where(
          sql`${[
            usersTable.firstName,
            usersTable.surname,
            usersTable.cpf,
            usersTable.birthDate,
          ]} IS NOT NULL`,
        )
        .execute()
        .then(
          (users) =>
            users
              .map(trimNullProperties)
              .map((person) => person as PersonUncheckedProps)
              .map(Person.createUnchecked),
          // as we're ensure the person is valid within the sql query, we can replace the below code with the above one,
          // which filter valid persons with filter and map operations
          // users
          // .map(trimNullProperties)
          // .map(Person.tryCreateUnchecked),
          // .filter((person) => option.isSome(person))
          // .map((person) => person.value),
        )
    );
  }

  getHello(): string {
    return "Hello World!";
  }
}
