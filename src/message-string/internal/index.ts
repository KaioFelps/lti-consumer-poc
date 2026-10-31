type ValidFormatterArgValue =
  | undefined
  | string
  | number
  | boolean
  | bigint
  | null
  | undefined
  | { [key: PropertyKey]: ValidFormatterArgValue }
  | ValidFormatterArgValue[];

export type MessageStringFormatterArg = {
  [key: PropertyKey]: ValidFormatterArgValue;
};

/**
 * A message string can be either a simple string or a function that
 * receives arguments and format them to a string.
 *
 * A `MessageString` function should never throw or return anything
 * but a string. In case there is a undefined parameter, it should
 * log a warn, but still render the message string.
 */
// biome-ignore lint/suspicious/noExplicitAny: easier for writing the translations
export type MessageString = string | ((args: any, identifier: string) => string);

export type MessageStringTranslationMap = Record<string, MessageString>;
