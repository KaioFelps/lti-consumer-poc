import z from "zod";
import { AnyLtiRole, InstitutionRole, MembershipRole, SystemRole } from "$/claims/enums/roles";
import { MessageType } from "$/claims/serialization";
import { GrantType, LTI_TOOL_CONFIGURATION_KEY } from "$/registration/dynamic/tool-configuration";
import { MessagePlacement } from "$/registration/enums/message-placement";

/**
 * Describes the values and its constraints specified by [LTI Dynamic Registration] specifications.
 *
 * [LTI Dynamic Registration]: https://www.imsglobal.org/spec/lti-dr/v1p0#lti-configuration-0
 */
export const ltiToolConfigurationSchema = z.object({
  domain: z.string(),
  secondary_domains: z.array(z.string()).optional(),
  deployment_id: z.string().optional(),
  target_link_uri: z.url(),
  description: z.string().optional(),
  claims: z.array(z.string()),
  custom_parameters: z.record(z.string(), z.string()).optional(),
  messages: z.array(
    z.object({
      type: z.enum([MessageType.deepLinking, MessageType.resourceLink] satisfies MessageType[]),
      target_link_uri: z.url().optional(),
      label: z.string().optional(),
      icon_uri: z.url().optional(),
      placements: z
        .array(
          z.enum([
            MessagePlacement.ContentArea,
            MessagePlacement.RichTextEditor,
          ] satisfies MessagePlacement[]),
        )
        .optional(),
      roles: z
        .array(
          z.enum([
            ...[
              InstitutionRole.Administrator,
              InstitutionRole.Faculty,
              InstitutionRole.Guest,
              InstitutionRole.None,
              InstitutionRole.Other,
              InstitutionRole.Staff,
              InstitutionRole.Student,
              InstitutionRole.Alumni,
              InstitutionRole.Instructor,
              InstitutionRole.Learner,
              InstitutionRole.Member,
              InstitutionRole.Mentor,
              InstitutionRole.Observer,
              InstitutionRole.ProspectiveStudent,
            ],
            ...[
              MembershipRole.Administrator,
              MembershipRole.ContentDeveloper,
              MembershipRole.Instructor,
              MembershipRole.Learner,
              MembershipRole.Mentor,
              MembershipRole.Manager,
              MembershipRole.Member,
              MembershipRole.Officer,
            ],
            ...[
              SystemRole.Administrator,
              SystemRole.None,
              SystemRole.AccountAdmin,
              SystemRole.Creator,
              SystemRole.SysAdmin,
              SystemRole.SysSupport,
              SystemRole.User,
            ],
          ] satisfies AnyLtiRole[]),
        )
        .optional(),
      custom_parameters: z.record(z.string(), z.string()).optional(),
    }),
  ),
});

/**
 * This object describes the expected tool configuration sent by some
 * tool during dynamic register.
 */
export const draftLtiDynamicToolConfigurationSchema = z.object({
  client_id: z.string().optional(),
  application_type: z.enum(["web"]),
  grant_types: z.array(z.enum(["client_credentials", "implicit"] satisfies GrantType[])).min(2),
  response_types: z.array(z.enum(["id_token"])).min(1),
  redirect_uris: z.array(z.url()).min(1),
  initiate_login_uri: z.url(),
  client_name: z.string(),
  jwks_uri: z.url(),
  logo_uri: z.url().optional(),
  token_endpoint_auth_method: z.enum(["private_key_jwt"]),
  contacts: z.array(z.email()).optional(),
  client_uri: z.url().optional(),
  tos_uri: z.url().optional(),
  policy_uri: z.url().optional(),
  scope: z.string(),
  [LTI_TOOL_CONFIGURATION_KEY]: ltiToolConfigurationSchema,
});
