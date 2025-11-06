# Message String
This is a module that implements a naïve translator/string formatter.
Modules should define translations of strings and use the created identifier
as messages.

Errors and other services **should never request a message directly, but rather a
identifier for a message string that will be parsed used `translate` further on**.

## Defining Message Strings

Modules may contain a `strings/` directory with typescript files that augments
a specific locale message strings object. For example, for a en-US message strings
object:

```typescript
// my-module/strings/en-US.ts
import { enUS } from "@/message-string/internal/translations/en-US";

enUS["my-module:message:identifier"] = "This is a simple string message",
enUS["my-module:message:another-id"] = (args, identifier) => {
    return `The identifier ${identifier} is a complex identifier `
            + `that uses extra dynamic arguments, like ${args.foo}.`;
}
```

## Unrecognized Identifiers and String Maps

When `TranslatorService` cannot find a message strings map for a given language,
it returns the identifier untouched.

If there is a message strings map but the given identifier is not present,
`translate` function will throw a `IrrecoverableError` accusing which identifier
is missing in which language message strings map, e.g.:
```
IrrecoverableError: The identifier <IDENTIFIER> have not been set to <MESSAGE_STRINGS_LANGUAGE> translations.
```