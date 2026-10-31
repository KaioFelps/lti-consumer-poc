import { SystemRole } from "@/modules/identity/user/enums/system-role.js";
import {
  //   InstitutionRole,
  SystemRole as LtiSystemRole,
  //   MembershipRole,
} from "$/core/claims/enums/roles.js";

export function mapRolesToLtiSystemRoles(sysRole: SystemRole) {
  switch (sysRole) {
    case SystemRole.Admin:
      return [LtiSystemRole.Administrator, LtiSystemRole.SysAdmin];

    case SystemRole.User:
      return [LtiSystemRole.User];
  }
}
