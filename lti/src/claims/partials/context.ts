/**
 * This is an object to ensure type-safety of the LTI context claim.
 */

import { ContextType } from "..";
import { IntoLtiClaim } from "../serialization";

export class ContextClaim<CustomContextType = never> implements IntoLtiClaim {
  private constructor(
    /**
     * An unique and stable ID that identifies the context:
     * - globally in the platform;
     * - locally in the tool (i.e., there can be only one pair of [deployment_id, context.id] in the
     * platform side).
     */
    public readonly id: string,
    /**
     * A list containing the applicable context types for this launch.
     * A plataform may (but should not) use custom context types — they must also
     * be fully resolved URIs.
     */
    public readonly type?: [
      ContextType,
      ...(CustomContextType | ContextType)[],
    ],
    /**
     * A short and meaningful name for the context.
     */
    public readonly label?: string,
    /**
     * The descriptive full name of this context.
     */
    public readonly title?: string,
  ) {}

  public static fromClaims<CustomContextType>(
    claims: ContextClaim<CustomContextType>,
  ): ContextClaim<CustomContextType> {
    return new ContextClaim(claims.id, claims.type, claims.label, claims.title);
  }

  intoLtiClaim(): object {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      title: this.title,
    };
  }
}
