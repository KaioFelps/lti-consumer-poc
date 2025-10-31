import { Nullable } from "common/src/types/nullable";
import type { Optional } from "common/src/types/optional";
import { option } from "fp-ts";
import { Option } from "fp-ts/lib/Option";
import { EntityBase } from "@/core/entity-base";
import { User, type UserProps, UserUncheckedProps } from "../user/user.entity";
import type { PersonGender } from "./enums/gender";
import { CPF } from "./value-objects/cpf";

export type PersonProps = {
  user: User;
  cpf: CPF;
  birthDate: Date;
  gender?: PersonGender;
  firstName: string;
  surname: string;
  email: string;
};

export type PersonUncheckedProps = UserUncheckedProps &
  Omit<PersonProps, "cpf" | "gender"> & {
    cpf: string;
    gender: PersonGender | null | undefined;
  };

/**
 * Used to parse an raw response from Drizzle
 */
export type PersonNullableProps = UserUncheckedProps &
  Nullable<
    PersonUncheckedProps,
    "cpf" | "birthDate" | "gender" | "firstName" | "surname"
  >;

export class Person extends EntityBase<PersonProps> {
  public static create(
    props_: Omit<PersonProps, "user"> &
      Omit<Optional<UserProps, "systemRole">, "id">,
  ) {
    const { passwordHash, username, profilePictureUrl, systemRole, ...props } =
      props_;

    const user = User.create({
      passwordHash,
      username,
      profilePictureUrl,
      systemRole,
    });

    return Person.createFromUser(user, props);
  }

  public static createFromUser(
    user: User,
    props: Omit<PersonProps, "user">,
  ): Person {
    return new Person({ user, ...props });
  }

  public static createUnchecked(props: PersonUncheckedProps): Person {
    const personProps = {
      birthDate: props.birthDate,
      cpf: CPF.createUnchecked(props.cpf),
      firstName: props.firstName,
      surname: props.surname,
      email: props.email,
      user: User.createUnchecked({
        id: props.id,
        passwordHash: props.passwordHash,
        profilePictureUrl: props.profilePictureUrl,
        systemRole: props.systemRole,
        username: props.username,
      }),
      gender: props.gender ?? undefined,
    } satisfies PersonProps;

    return new Person(personProps);
  }

  /**
   * A utility method simply acts like an adaptor that ensures
   * every required property exists in an partial raw person object.
   *
   * @returns `None` if it's not a valid person. `Some(Person)` otherwise.
   */
  public static tryCreateUnchecked(
    partialProps: Optional<
      PersonUncheckedProps,
      "birthDate" | "cpf" | "firstName" | "surname"
    >,
  ): Option<Person> {
    if (
      typeof partialProps.birthDate === "undefined" ||
      typeof partialProps.cpf === "undefined" ||
      typeof partialProps.firstName === "undefined" ||
      typeof partialProps.surname === "undefined" ||
      typeof partialProps.email === "undefined"
    )
      return option.none;

    return option.some(
      Person.createUnchecked({
        ...partialProps,
        birthDate: partialProps.birthDate,
        cpf: partialProps.cpf,
        firstName: partialProps.firstName,
        surname: partialProps.surname,
      }),
    );
  }

  // getters
  public getUser(): User {
    return this.props.user;
  }

  public getCpf(): CPF {
    return this.props.cpf;
  }

  public getBirthDate(): Date {
    return this.props.birthDate;
  }

  public getGender(): PersonGender | undefined {
    return this.props.gender;
  }

  public getFirstName(): string {
    return this.props.firstName;
  }

  public getSurname(): string {
    return this.props.surname;
  }

  public getName(): string {
    return `${this.getFirstName()} ${this.getSurname()}`;
  }

  public getEmail(): string {
    return this.props.email;
  }

  public __getProps(): PersonProps {
    return this.props;
  }
}
