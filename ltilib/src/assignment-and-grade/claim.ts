import { either as e } from "fp-ts";
import { IntoLtiClaim } from "$/claims/serialization";
import { Context } from "$/core/context";
import { Platform } from "$/core/platform";
import { MissingPlatformAgsConfiguration } from "./errors/missing-platform-ags-configuration.error";
import { LtiLineItem } from "./line-item";
import { AssignmentAndGradeServiceScopes } from "./scopes";

const AGS_CLAIM_KEY = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint";

interface AgsClaimConstructorArgs {
  specificLineItem: LtiLineItem | undefined;
  context: Context;
  platform: Platform;
  scopes: AssignmentAndGradeServiceScopes[];
}

export class AssignmentAndGradeServiceClaim implements IntoLtiClaim {
  public static KEY = AGS_CLAIM_KEY;

  private constructor(
    private specificLineItem: LtiLineItem | undefined,
    private context: Context,
    private agsConfig: Platform.LtiAssignmentAndGradeServicesConfig,
    private scopes: AssignmentAndGradeServiceScopes[],
  ) {}

  public static create({ context, platform, scopes, specificLineItem }: AgsClaimConstructorArgs) {
    if (!platform.agsConfiguration) return e.left(new MissingPlatformAgsConfiguration());

    const agsClaim = new AssignmentAndGradeServiceClaim(
      specificLineItem,
      context,
      platform.agsConfiguration,
      scopes,
    );

    return e.right(agsClaim);
  }

  public intoLtiClaim(): object {
    const agsClaim = {
      ...this.getlineItemField(),
      lineitems: this.agsConfig.lineItemsContainerEndpoint(this.context).toString(),
      scope: this.scopes,
    };

    return { [AGS_CLAIM_KEY]: agsClaim };
  }

  private getlineItemField() {
    if (!this.specificLineItem) return {};

    return {
      lineitem: this.agsConfig.lineItemEndpoint(this.context, this.specificLineItem.id).toString(),
    };
  }
}
