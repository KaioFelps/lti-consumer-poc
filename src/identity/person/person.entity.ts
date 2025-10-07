import type { Optional } from "common/src/types/optional";
import { EntityBase } from "@/core/entity-base";
import { User, type UserProps } from "../user/user.entity";
import type { PersonGender } from "./enums/gender";
import type { CPF } from "./value-objects/cpf";

export type PersonProps = {
  user: User;
  cpf: CPF;
  birthDate: Date;
  gender?: PersonGender;
  firstName: string;
  surname: string;
};

export class Person extends EntityBase<PersonProps> {
  public static create(
    props_: Omit<PersonProps, "user"> & Optional<UserProps, "id">,
  ) {
    const { id, passwordHash, username, profilePictureUrl, ...props } = props_;

    const user = User.create({
      id: id ?? Person.generateId(),
      passwordHash,
      username,
      profilePictureUrl,
    });

    return Person.createFromUser(user, props);
  }

  public static createFromUser(
    user: User,
    props: Omit<PersonProps, "user">,
  ): Person {
    return new Person({ user, ...props });
  }
}
