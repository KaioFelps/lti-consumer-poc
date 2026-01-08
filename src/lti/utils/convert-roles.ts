import { SystemRole } from "@/identity/user/enums/system-role";
import {
  //   InstitutionRole,
  SystemRole as LtiSystemRole,
  //   MembershipRole,
} from "$/claims/enums/roles";

export function getLtiRolesFromSystemRole(sysRole: SystemRole) {
  switch (sysRole) {
    case SystemRole.Admin:
      return [LtiSystemRole.Administrator, LtiSystemRole.SysAdmin];

    case SystemRole.User:
      return [LtiSystemRole.User];
  }
}
