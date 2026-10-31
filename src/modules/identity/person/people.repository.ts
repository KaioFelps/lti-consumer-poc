import { Either } from "fp-ts/lib/Either.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { PersonNotFoundError } from "../errors/person-not-found.error.js";
import { Person } from "./person.entity.js";

export abstract class PeopleRepository {
  public abstract createPerson(person: Person): Promise<Either<IrrecoverableError, Person>>;

  public abstract findById(
    personId: string,
  ): Promise<Either<IrrecoverableError | PersonNotFoundError, Person>>;
}
