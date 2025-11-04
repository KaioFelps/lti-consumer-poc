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
  // TODO: find out where are claims being located at and then
  // try to find acr.essential && acr.values
  // TODO: acr.values must override params.acr_values if present
  console.debug("interaction.prompt.details", interaction.prompt.details);
  console.debug("interaction.params.claims", interaction.params.claims);
  console.debug("interaction.params.acr_values", interaction.params.acr_values);
  console.debug("interaction.params.id_token", interaction.params.id_token);

  const claimsObject = interaction.prompt.details.claims as object | undefined;
  if (claimsObject && "acr" in claimsObject) {
    const acrObject = claimsObject.acr as {
      essential?: boolean;
      value?: string;
      values?: string[];
    };

    const acrValues = new Set([...(acrObject.values ?? [])]);
    if (acrObject.value) acrValues.add(acrObject.value);

    return {
      essential: acrObject.essential ?? false,
      values: Array.from(acrValues),
    };
  }

  const acr = interaction.params.acr_values as string | undefined;
  if (acr) return { essential: false, values: acr.split(" ") };
}
