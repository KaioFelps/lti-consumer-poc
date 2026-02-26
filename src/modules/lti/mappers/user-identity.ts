import { Person } from "@/modules/identity/person/person.entity";
import { UserIdentity, UserRoles } from "$/core/user-identity";
import utils from ".";

/**
 * Extracts a ltilib {@link UserIdentity `UserIdentity`} from
 * an instance of {@link Person `Person`}.
 */
export function mapPersonToUserIdentity<CustomRoles = never>(
  person: Person,
  extraClaims?: UserIdentity["extraClaims"],
) {
  const identity = UserIdentity.create<CustomRoles>({
    id: person.getUser().getId().toString(),
    familyName: person.getSurname(),
    email: person.getEmail(),
    givenName: person.getFirstName(),
    name: person.getName(),
    roles: utils.mapRolesToLtiSystemRoles(person.getUser().getSystemRole()) as UserRoles,
  });

  if (extraClaims) {
    for (const [key, value] of Object.entries(extraClaims)) {
      identity.addExtraClaim(key, value);
    }
  }

  return identity;
}
