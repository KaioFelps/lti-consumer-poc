# Message String
This is a module that implements a naïve translator/string formatter.
Modules should define translations of strings and use the created identifier
as messages.

Errors and other services should never request a message directly, but rather a
identifier for a message string that will be parsed used `translate` further on.

## Defining Message Strings

Modules may contain a `strings/` directory with typescript files that exports
objects of type `MessageStringTranslationMap`.

These objects must be registered in the global language strings object by
using the spread operator:

```typescript
// my-module/strings/en-US.ts
import { MessageStringTranslationMap } from "@/message-string/internal";

export const myModuleMessageStrings: MessageStringTranslationMap = {
    "my-module:message:identifier": "This is a simple string message",
    "my-module:message:another-id": (args, identifier) => {
        return `The identifier ${identifier} is a complex identifier `
                + `that uses extra dynamic arguments, like ${args.foo}.`;
    }
};

// message-string/internal/translations/en-US.ts
import { MessageStringTranslationMap } from "@/message-string/internal";
import { myModuleMessageStrings } from "@/my-module/strings/en-US.ts";

export const enUS: MessageStringTranslationMap = {
    // other strings...
    ...myModuleMessageStrings,
};
```
