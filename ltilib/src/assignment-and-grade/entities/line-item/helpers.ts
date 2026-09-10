import { either as e } from "fp-ts";
import { CustomParameters, RawCustomParameters } from "../../custom-parameters";
import { InvalidLineItemArgumentError } from "../../errors";
import { LtiLineItem } from ".";

export function validateScoreMaximum(scoreMaximum: LtiLineItem["scoreMaximum"]) {
  if (scoreMaximum === null || scoreMaximum === undefined) {
    return e.left(new InvalidLineItemArgumentError("scoreMaximum", "required"));
  }

  if (scoreMaximum <= 0) {
    return e.left(new InvalidLineItemArgumentError("scoreMaximum", "must_be_greater_than_zero"));
  }

  return e.right(undefined);
}

export function validateLabel(label: string | undefined) {
  label = label?.trim();
  if (!label) return e.left(new InvalidLineItemArgumentError("label", "required"));
  return e.right(label);
}

/**
 * Inserts every custom parameter from `customParameters` into `lineItem`, silently ignoring
 * invalid properties.
 */
export function setCustomParameters(params: CustomParameters, entries?: RawCustomParameters) {
  if (entries) {
    Object.entries(entries).forEach(([key, value]) => params.add(key, value));
  }

  return e.right(undefined);
}
