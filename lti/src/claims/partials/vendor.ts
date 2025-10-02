import { IntoLtiClaim } from "../serialization";

type ValidClaimValue =
  | Array<ValidClaimValue>
  | { [key: string]: ValidClaimValue }
  | (string | number | boolean);

export class VendorExtraClaims implements IntoLtiClaim {
  public constructor(
    private readonly vendorPredicade: string,
    private readonly claims: Record<string, ValidClaimValue>,
  ) {
    if (vendorPredicade.endsWith("/"))
      this.vendorPredicade = vendorPredicade.slice(
        0,
        vendorPredicade.length - 1,
      );
  }

  intoLtiClaim(): object {
    return Object.entries(this.claims).map(([key, value]) => ({
      [`${this.vendorPredicade}/${key}`]: value,
    }));
  }
}
