import { Person } from "@/modules/identity/person/person.entity";

type PresentedPerson = {
  id: string;
  systemRole: string;
  username: string;
  email: string;
  firstName: string;
  surname: string;
  cpf: string;
  birthDate: Date;
  gender: string | null;
  profilePictureUrl: string | null;
};

export class PersonPresenter {
  public static present(entity: Person): PresentedPerson {
    return {
      birthDate: entity.getBirthDate(),
      cpf: entity.getCpf().toString(),
      email: entity.getEmail(),
      firstName: entity.getFirstName(),
      gender: entity.getGender()?.toString() ?? null,
      id: entity.getUser().getId().toString(),
      profilePictureUrl: entity.getUser().getProfilePictureUrl(),
      surname: entity.getSurname(),
      systemRole: entity.getUser().getSystemRole().toString(),
      username: entity.getUser().getUsername(),
    };
  }
}
