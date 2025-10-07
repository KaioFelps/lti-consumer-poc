import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { MessageStringFormatterArg, MessageStringTranslationMap } from ".";

/**
 * Obtain a message string from some language by indexing the message from `strings`
 * and formatting it with given `args` if required.
 *
 * @param identifier
 * @param args
 * @param strings
 * @param language
 * @returns A formatted string message.
 * @throws {IrrecoverableError} If the `identifier` does not exist in `strings`.
 */
export function translate(
  identifier: string,
  args: MessageStringFormatterArg = {},
  strings: MessageStringTranslationMap,
  language: string,
) {
  const msg = strings[identifier];

  if (!msg)
    throw new IrrecoverableError(
      `The identifier ${identifier} have not been set to ${language} translations.`,
    );

  const isCallable = typeof msg === "function";
  if (!isCallable) return msg;
  return msg(args, identifier);
}
