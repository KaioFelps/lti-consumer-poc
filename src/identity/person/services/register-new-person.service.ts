import { Inject, Injectable } from "@nestjs/common";
import { Either } from "fp-ts/lib/Either";
import { PasswordHasher } from "@/auth/password/hasher";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { SystemRole } from "@/identity/user/enums/system-role";
import { PersonGender } from "../enums/gender";
import { PeopleRepository } from "../people.repository";
import { Person } from "../person.entity";
import { CPF } from "../value-objects/cpf";

type RegisterNewPersonParams = {
  email: string;
  firstName: string;
  surname: string;
  birthDate: Date;
  gender?: PersonGender;
  cpf: CPF;
  username: string;
  password: string;
  profilePictureUrl?: string;
  systemRole?: SystemRole;
};

@Injectable()
export class RegisterNewPersonService {
  @Inject()
  private readonly passwordHasher: PasswordHasher;

  @Inject()
  private readonly peopleRepository: PeopleRepository;

  public async execute({
    birthDate,
    cpf,
    email,
    firstName,
    surname,
    password,
    username,
    gender,
    profilePictureUrl,
    systemRole,
  }: RegisterNewPersonParams): Promise<Either<IrrecoverableError, Person>> {
    const passwordHash = await this.passwordHasher.hash(password);

    const person = Person.create({
      birthDate,
      cpf,
      email,
      firstName,
      surname,
      gender,
      passwordHash,
      username,
      profilePictureUrl,
      systemRole: systemRole ?? SystemRole.User,
    });

    return await this.peopleRepository.createPerson(person);
  }
}
