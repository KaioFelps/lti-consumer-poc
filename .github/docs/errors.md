# Errors and Exceptions

Errors are an important part of any application. When a system returns different
errors on distinct situations, it makes harder for the front-end to keep up with
them.

For this, there is a standardized way of creating and using errors within this
proof-of-concept application.

### TL;DR
Use errors inside your application, returning them as `Either` instances.
Convert them to exceptions in controllers and throw them.

Let "Your" be your error's name, e.g. "ResourceNotFound". To create a
new error, you:

1. **must** create the error class so that `YourError extends ErrorBase` and place
  it in `/src/core/errors/`;
2. **may** create an exception class so that `YourException extends BaseException` and
  place it in `/src/lib/exceptions/your/exception.ts`;
3. **must** make your exception obtainable from [`ExceptionsFactory`];
4. **may** create an exception filter such that `YourExceptionFilter implements ExceptionFilter`
  and place it in `/src/lib/exceptions/your/exception-filter.ts`,
  and, if created, you **must**:
    - create a module `YourExceptionModule` in `src/lib/exceptions/your/your-exception.module.ts`;
    - register `YourExceptionFilter` in `YourExceptionModule.imports` using an object like
      `{ provide: APP_FILTER, useClass: YourExceptionFilter }`;
    - import `YourExceptionModule` in [`GlobalExceptionFiltersModule.imports`].

## Creating New Errors

An error is a class that extends [`ErrorBase`]. It may have additional properties
which are relevant to describe that error. The [`ErrorBase`] class ensures every
application error has, at the very least, a message string identifier to describe
it.

The absolute goal of an error is to carry a message -- that explains what
went wrong -- to the client. To achieve this, sometimes a simple message
isn't enough, but some more context is needed. Your custom errors should use
additional properties to handle these extra data related to your message.

These errors may be returned from anywhere in the application, specially by services
or other core level components.

Every error must be placed inside `src/core/errors/` directory.
**No error must ever be thrown**: they must be returned as the `left` variant
from an `Either` instance.

[`ErrorBase`]: /src/core/errors/error-base.ts

## Exceptions

Every error must me mappable to an exception. An exception decorates an
error. Beyond holding the error, it is also responsible for picking a
`HttpStatus` to represent that error when it finally becomes a JSON output.
You can face it as an adapter for the core errors to the outside world.

Custom exceptions should inherit [`BaseException`] class. However, in some cases
where they don't fit in, they must extend `HttpException` directly.
Exceptions must be creatable from an error instance. You should do this
by registering new variants of errors in [`ExceptionsFactory`].

**Not every error needs a specific exception**, most of them can be handled
by [`BaseException`] directly (in such case, you got to specify what
`HttpStatus` should represent that error in the factory).

**You must instantiate the equivalent exception of your error** (using
the [`ExceptionsFactory`]) **and throw it** from inside a controller. **Never
from anywhere else deeper in the application core**. Remember: exceptions are
nothing but [decorators] for the core errors.

[decorators]: https://refactoring.guru/design-patterns/decorator

## Exceptions Filter

Every exception must have an exception filter to handle it. Exceptions
that doesn't inherit [`BaseException`] **must implement their own filter**.
Those who does inherit it, can rely on `BaseExceptionFilter`, but may also create
specific filters if needed.

An exception filter catches an exception and serializes it with a proper
presenter. An exception without a filter could expose additional data that is
irrelevant to the client and also the message string identifier rather than a
significant message. These are both unwanted behaviors.

## Exceptions Presenters

The error a exception decorates must be serialized by the related filter before
being finally sent to the client. The filter uses an [`ExceptionPresenter`] to
format this error.

A presenter receives a exception and format the error it holds properly.
Presenting it includes "translating" the error message. To get this done,
presenters must be decorated with Nest.js `@Injectable()` decorator
with `REQUEST` scope and get a [`TranslatorService`] instance to
resolve the message string contained in the error.

Filters may get a presenter instance by requesting it from Nest.js IoC
container.

Errors that extends `ErrorBase` may be serialized by the
[`SimpleExceptionPresenter`]. If needed, you may add a new presenter class
to serialize more complex errors.  To do so, create a presenter class that
implements [`ExceptionPresenter`] and register it as a provider inside
[`GlobalExceptionFiltersModule.providers`].

[`ExceptionsFactory`]: /src/lib/exceptions/exception-factory.ts
[`ExceptionPresenter`]: /src/lib/presenters/exception-presenter.ts
[`BaseException`]: /src/lib/exceptions/base/exception.ts
[`TranslatorService`]: /src/message-string/translator.service.ts
[`SimpleExceptionPresenter`]: /src/lib/presenters/exceptions/simple-exception.presenter.ts

## Creating Erros and Exceptions

For each error, a new directory must be created inside `src/lib/exceptions/`,
and both an `exception.ts` and `exception-filter.ts` files must be created
containing the error's exception decorator and its filter, respectively.

Your exception filter must be decorated with Nest.js `@Injectable()` decorator.
If you're using the [`TranslatorService`] (and you likely are), you must set
the your filter's scope to `REQUEST` (`@Injectable({ scope: Scope.REQUEST })`).

Your filter needs to be decorated with `@Catch(<YOUR_EXCEPTION_CLASS>)`, so that
Nest.js knows what error this filter is supposed to handle.

## Modules

If you ended up creating a exception filter, it may compose a module. Therefore,
do create a `your-exception.module.ts` file containing a Nest
`YourExceptionModule` valid module. You must register `YourException` in
`YourExceptionModule.providers` within an object like
`{ provide: APP_FILTER, useClass: <YOUR_ERROR_EXCEPTION> }`.

Import `YourExceptionModule` in [`GlobalExceptionFiltersModule.imports`] so that
it's discovered by NestJS.

## Exception Filter's Responder Strategies

Endpoints may be either a RESTful handler or a classic MVC one. Depending on
its kind, exceptions must be handled in different manners.

Usually, a API endpoint would return errors as a JSON, while MVC routes would
redirect to the previous route flashing this error.

Therefore, in order to handle both cases, when your error is too complex to fit
in the [`BaseException`] and its filter, you also need to create a factory that
will create the correct error response (as said above).

```ts
// /src/lib/exceptions/your/responder.factory.ts
import { HttpStatus, Injectable } from "@nestjs/common";
import { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { YourExceptionPresenter } from "@/external/presenters/exceptions/your-exception.presenter";
import { HttpRequest, HttpResponse } from "@/lib";
import { TranslatorService } from "@/message-string/translator.service";
import { ExceptionFilterResponderFactory } from "../../exception-responders/factory";
import { ExceptionFilterResponder } from "../../exception-responders/responder";
import { YourException } from "./exception";

type Output = ...; // usually void for redirects and some sort of object for JSON responses

@Injectable()
export class YourExceptionFilterResponderFactory extends ExceptionFilterResponderFactory<YourException, Output> {
  public constructor(
    private readonly presenter: YourExceptionPresenter,
    private readonly translator: TranslatorService,
  ) {
    super();
  }

  public create(request: HttpRequest): ExceptionFilterResponder<YourException, Output> {
    if (this.isMVC(request)) return new MVCStrategy(this.translator);
    return new APIStrategy(this.presenter);
  }
}

class MVCStrategy extends ExceptionFilterResponder {
  public constructor(private readonly t: TranslatorService) {
    super();
  }

  public async respond(
    _status: number,
    ctx: HttpArgumentsHost,
    exception: YourException,
  ): Promise<void> {
    const request = ctx.getRequest<HttpRequest>();
    const response = ctx.getResponse<HttpResponse>();
    const session = request["session"] as Record<string, unknown>;
    const target = request.headers.referer ?? "/";

    const errorMessage = await this.t.translate(
      exception.error.errorMessageIdentifier,
      exception.error.messageParams,
    );

    session.error = errorMessage;

    // set the body to flash so that the EJS template can persist
    // the input values.
    if (session.flash) session.flash["values"] = request.body;
    else {
      session.flash = {
        values: request.body,
      };
    }

    return response.redirect(HttpStatus.FOUND, target);
  }
}

export class APIStrategy extends ExceptionFilterResponder {
  public constructor(private readonly presenter: YourExceptionPresenter) {
    super();
  }

  public async respond(
    status: number,
    ctx: HttpArgumentsHost,
    exception: YourException,
  ): Promise<object> {
    return ctx
      .getResponse<HttpResponse>()
      .status(status)
      .json(await this.presenter.present(exception));
  }
}
```

Don't forget to register this as a provider in `YourExceptionModule`.

[`GlobalExceptionFiltersModule.providers`]: /src/lib/globals/exception-filters.module.ts
[`GlobalExceptionFiltersModule.imports`]: /src/lib/globals/exception-filters.module.ts