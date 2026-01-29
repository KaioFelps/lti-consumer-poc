import { Person } from "@/identity/person/person.entity";
import { UserIdentity, UserRoles } from "$/core/user-identity";
import utils from ".";

/**
 * Extracts a ltilib {@link UserIdentity `UserIdentity`} from
 * an instance of {@link Person `Person`}.
 */
export function extractUserIdentity<CustomRoles = never>(
  person: Person,
  extraClaims: UserIdentity["extraClaims"] = {},
) {
  return UserIdentity.create<CustomRoles>({
    id: person.getUser().getId().toString(),
    familyName: person.getSurname(),
    email: person.getEmail(),
    givenName: person.getFirstName(),
    name: person.getName(),
    roles: utils.getLtiRolesFromSystemRole(
      person.getUser().getSystemRole(),
    ) as UserRoles,
    extraClaims,
  });
}
