import { UnauthorizedError } from "@/core/errors/unauthorized.error.js";
import { Person } from "@/modules/identity/person/person.entity.js";

export class NotAnInstructorError extends UnauthorizedError {
  public constructor(person: Person) {
    super({
      errorMessageIdentifier: "courses:errors:not-an-instructor",
      messageParams: { name: person.getName() },
    });
  }
}
