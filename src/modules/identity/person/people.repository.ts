import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { PersonNotFoundError } from "../errors/person-not-found.error";
import { Person } from "./person.entity";

export abstract class PeopleRepository {
  public abstract createPerson(
    person: Person,
  ): Promise<Either<IrrecoverableError, Person>>;

  public abstract findById(
    personId: string,
  ): Promise<Either<IrrecoverableError | PersonNotFoundError, Person>>;
}
