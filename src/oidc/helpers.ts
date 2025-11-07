import type { Interaction } from "oidc-provider";

/**
 * This is the resolution of `acr` values from either the parameter or the claim.
 * As the behavior under both `params.acr_values` and `id_token.acr.{value, values}`
 * is left undefined by the specification (see [acr semantics]), this implementation
 * will let the acr claim values override `acr_values` parameter.
 *
 *[acr semantics]: https://openid.net/specs/openid-connect-core-1_0.html#acrSemantics
 */
export function resolveAcrValues(
  interaction: Interaction,
): { essential: boolean; values: string[] } | undefined {
  /**
   * interaction.prompt.details { acr: { value: 'loa1', essential: true, values: [ '["loa1"]' ] } }  type: object
   * interaction.params.claims {"id_token":{"acr":{"value":"loa1","essential":true}}}  type: string
   * interaction.params.acr_values ["loa1"]  type: string
   * interaction.params.id_token undefined  type: undefined
   */
  type Details = {
    acr?: {
      value?: string;
      values?: string[];
      essential?: boolean;
    };
  };

  const details = interaction.prompt.details as Details;

  if (details.acr) {
    const acrValues = new Set([...(details.acr.values ?? [])]);
    if (details.acr.value) acrValues.add(details.acr.value);

    return {
      essential: details.acr.essential ?? false,
      values: Array.from(acrValues),
    };
  }

  const acr = interaction.params.acr_values as string | undefined;
  if (acr) return { essential: false, values: acr.split(" ") };
}
