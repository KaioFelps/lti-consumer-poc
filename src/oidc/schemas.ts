import { ClientMetadata } from "oidc-provider";
import z from "zod";

export const clientConfigurationSchema = z.object({
  client_id: z.uuid().optional(),
  application_type: z.enum([
    "web",
    "native",
  ] satisfies ClientMetadata["application_type"][]),
  client_name: z.string(),
  scope: z.string(),
  redirect_uris: z.array(z.string()).min(1),
  jwks_uri: z.url().optional(),
  client_secret: z.string().optional(),
});
