import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Person } from "./person.entity";

export abstract class PeopleRepository {
  public abstract createPerson(
    person: Person,
  ): Promise<Either<IrrecoverableError, Person>>;
}
