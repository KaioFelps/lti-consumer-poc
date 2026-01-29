import { Injectable } from "@nestjs/common";
import { option as opt, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { FindPersonByIdService } from "@/identity/person/services/find-person-by-id.service";
import { User } from "@/identity/user/user.entity";
import { eitherPromiseToTaskEither as teFromPromise } from "@/lib/fp-ts";
import utils from "@/lti/utils";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { ToolRecord } from "$/registration/tool-record";
import { validateAuthenticationRequest } from "$/security/validate-authentication-request";
import { LaunchLoginDto } from "../dtos/launch-login.dto";

type Params = {
  body: LaunchLoginDto;
  redirectUri: URL;
  tool: ToolRecord;
  user?: User;
};

@Injectable()
export class LaunchLoginService {
  public constructor(
    private launchServices: LtiLaunchServices,
    private findPersonByIdService: FindPersonByIdService,
  ) {}

  public async exec({ body, user, redirectUri, tool }: Params) {
    return await pipe(
      validateAuthenticationRequest(body),
      te.fromEither,
      te.chainW(() =>
        pipe(
          user,
          opt.fromNullable,
          opt.traverse(te.ApplicativePar)((user) =>
            pipe(
              teFromPromise(() =>
                this.findPersonByIdService.exec({ id: user.getId() }),
              ),
              te.map(utils.extractUserIdentity),
            ),
          ),
          te.map(opt.toUndefined),
          te.map((userIdentity) => userIdentity),
        ),
      ),
      te.chainW((userIdentity) =>
        teFromPromise(() =>
          this.launchServices.prepareLaunchRequest({
            tool,
            redirectUri,
            userIdentity,
            loginHint: body.login_hint,
            messageHint: body.lti_message_hint,
            nonce: body.nonce,
            state: body.state,
            fallbackUserRoles: undefined,
            errorDescriptionsRoutes: undefined,
            context: undefined,
          }),
        ),
      ),
    )();
  }
}
