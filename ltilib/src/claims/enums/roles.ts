import { option } from "fp-ts";
import { Option } from "fp-ts/lib/Option";

export type AnyLtiRole = InstitutionRole | MembershipRole | SystemRole;

const INSTITUTION_ROLE_PREDICADE =
  "http://purl.imsglobal.org/vocab/lis/v2/institution/person#";

export enum InstitutionRole {
  Administrator = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
  Faculty = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Faculty",
  Guest = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Guest",
  None = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#None",
  Other = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Other",
  Staff = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Staff",
  Student = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
  Alumni = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Alumni",
  Instructor = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor",
  Learner = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Learner",
  Member = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Member",
  Mentor = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Mentor",
  Observer = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Observer",
  ProspectiveStudent = "http://purl.imsglobal.org/vocab/lis/v2/institution/person#ProspectiveStudent",
}

const MEMBERSHIP_ROLE_PREDICADE =
  "http://purl.imsglobal.org/vocab/lis/v2/membership#";

export enum MembershipRole {
  Administrator = "http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator",
  ContentDeveloper = "http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper",
  Instructor = "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
  Learner = "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
  Mentor = "http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor",
  Manager = "http://purl.imsglobal.org/vocab/lis/v2/membership#Manager",
  Member = "http://purl.imsglobal.org/vocab/lis/v2/membership#Member",
  Officer = "http://purl.imsglobal.org/vocab/lis/v2/membership#Officer",
}

const SYSTEM_ROLE_PREDICADE =
  "http://purl.imsglobal.org/vocab/lis/v2/system/person#";

export enum SystemRole {
  Administrator = "http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator",
  None = "http://purl.imsglobal.org/vocab/lis/v2/system/person#None",
  AccountAdmin = "http://purl.imsglobal.org/vocab/lis/v2/system/person#AccountAdmin",
  Creator = "http://purl.imsglobal.org/vocab/lis/v2/system/person#Creator",
  SysAdmin = "http://purl.imsglobal.org/vocab/lis/v2/system/person#SysAdmin",
  SysSupport = "http://purl.imsglobal.org/vocab/lis/v2/system/person#SysSupport",
  User = "http://purl.imsglobal.org/vocab/lis/v2/system/person#User",
}

export abstract class RolesHelper {
  /**
   * Parses a IMS role full URL into an instance of `AnyLtiRole`.
   * @param roleUrl a full URL representing a valid IMS role
   * @returns the role parsed as an instance of the correct enum wrapped
   * in `Option` or `none` if it was not a valid or recognizable IMS role.
   */
  public static tryParseFromRoleURL(roleUrl: string): Option<AnyLtiRole> {
    const asInstitutionRole = RolesHelper.tryParseAsInstitutionRole(roleUrl);
    if (option.isSome(asInstitutionRole)) return asInstitutionRole;

    const asMembershipRole = RolesHelper.tryParseAsMembershipRole(roleUrl);
    if (option.isSome(asMembershipRole)) return asMembershipRole;

    const asSystemRole = RolesHelper.tryParseAsSystemRole(roleUrl);
    if (option.isSome(asSystemRole)) return asSystemRole;

    return option.none;
  }

  public static tryParseAsInstitutionRole(
    roleUrl: string,
  ): Option<InstitutionRole> {
    if (roleUrl.startsWith(INSTITUTION_ROLE_PREDICADE)) {
      return option.some(
        InstitutionRole[roleUrl.replace(INSTITUTION_ROLE_PREDICADE, "")],
      );
    }

    return option.none;
  }

  public static tryParseAsMembershipRole(
    roleUrl: string,
  ): Option<MembershipRole> {
    if (roleUrl.startsWith(MEMBERSHIP_ROLE_PREDICADE)) {
      return option.some(
        MembershipRole[roleUrl.replace(MEMBERSHIP_ROLE_PREDICADE, "")],
      );
    }

    return option.none;
  }

  public static tryParseAsSystemRole(roleUrl: string): Option<SystemRole> {
    if (roleUrl.startsWith(SYSTEM_ROLE_PREDICADE)) {
      return option.some(
        SystemRole[roleUrl.replace(SYSTEM_ROLE_PREDICADE, "")],
      );
    }

    return option.none;
  }
}
