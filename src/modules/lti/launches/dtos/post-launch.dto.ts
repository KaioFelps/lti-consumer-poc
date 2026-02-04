import { Expose } from "class-transformer";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/interfaces/dto";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

const schema = z.object({
  lti_errormsg: z.string({ error: "lti:post-launch:err-msg-must-be-string" }),
  lti_msg: z.string({ error: "lti:post-launch:msg-must-be-string" }),
  lti_errorlog: z.string({ error: "lti:post-launch:err-log-must-be-string" }),
  lti_log: z.string({ error: "lti:post-launch:log-must-be-string" }),
});

export class PostLaunchDto implements DTO {
  @Expose()
  errorMsg?: string;

  @Expose()
  errorLog?: string;

  @Expose()
  successMsg?: string;

  @Expose()
  successLog?: string;

  validate(): Either<ValidationErrors, void> {
    const { success, data, error } = schema.safeParse(this);

    if (!success) return either.left(mapZodErrorsToCoreValidationErrors(error));

    this.errorLog = data.lti_errorlog;
    this.errorMsg = data.lti_errormsg;
    this.successMsg = data.lti_msg;
    this.successLog = data.lti_log;

    return either.right(undefined);
  }
}
