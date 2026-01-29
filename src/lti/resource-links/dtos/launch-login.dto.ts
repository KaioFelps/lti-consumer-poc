import { HttpStatus } from "@nestjs/common";
import { Expose } from "class-transformer";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { z } from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { ConfigCoreValidation } from "@/lib/core-validation";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

@ConfigCoreValidation({ status: HttpStatus.BAD_REQUEST })
export class LaunchLoginDto implements DTO {
  private static schema = z.object({
    scope: z.string().refine((val) => val.split(" ").includes("openid"), {
      error: "lti:launch-login:scopes-must-contain-openid",
    }),
    response_type: z.literal("id_token", {
      error: "lti:launch-login:response-type-must-be-id-token",
    }),
    response_mode: z.literal("form_post", {
      error: "lti:launch-login:response-mode-must-be-form-post",
    }),
    client_id: z
      .string({ error: "lti:launch-login:client-id-must-be-string" })
      .min(1, { error: "lti:launch-login:client-id-must-not-be-empty" }),
    redirect_uri: z.url({ error: "lti:launch-login:redirect-uri-must-be-url" }),
    state: z
      .string({ error: "lti:launch-login:state-must-be-string" })
      .min(1, { error: "lti:launch-login:state-must-not-be-empty" }),
    nonce: z
      .string({ error: "lti:launch-login:nonce-must-be-string" })
      .min(1, { error: "lti:launch-login:nonce-must-not-be-empty" }),
    login_hint: z
      .string({ error: "lti:launch-login:login-hint-must-be-string" })
      .min(1, { error: "lti:launch-login:login-hint-must-not-be-empty" }),
    lti_message_hint: z
      .string({ error: "lti:launch-login:message-hint-must-be-string" })
      .min(1, { error: "lti:launch-login:message-hint-must-not-be-empty" })
      .optional(),
    prompt: z
      .enum(["none", "login", "consent", "select_account"], {
        error: "lti:launch-login:prompt-must-be-within-enum",
      })
      .optional(),
  });

  @Expose()
  scope: string;
  @Expose()
  response_type: "id_token";
  @Expose()
  response_mode: "form_post";
  @Expose()
  client_id: string;
  @Expose()
  redirect_uri: string;
  @Expose()
  state: string;
  @Expose()
  nonce: string;
  @Expose()
  login_hint: string;
  @Expose()
  lti_message_hint: string;
  @Expose()
  prompt: "none" | "login" | "consent" | "select_account";

  validate(): Either<ValidationErrors, void> {
    const { data, error, success } = LaunchLoginDto.schema.safeParse(this);

    if (!success) return e.left(mapZodErrorsToCoreValidationErrors(error));

    Object.assign(this, data);
    return e.right(undefined);
  }
}
