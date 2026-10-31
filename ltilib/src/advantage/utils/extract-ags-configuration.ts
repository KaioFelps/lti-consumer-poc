import { either as e, taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { MissingPlatformAgsConfigurationError } from "$/assignment-and-grade/errors.js";
import { Platform } from "$/core/platform.js";

export function extractAgsConfiguration(platform: Platform) {
  if (!platform.agsConfiguration) return e.left(new MissingPlatformAgsConfigurationError());
  return e.right(platform.agsConfiguration);
}

export function extractAgsConfigurationAsTask(platform: Platform) {
  return pipe(extractAgsConfiguration(platform), taskEither.fromEither);
}
