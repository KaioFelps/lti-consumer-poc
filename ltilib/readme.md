# Ltilib
LTILIB is a framework-agnostic library that provides LTI services (from core to LTI Advantage). 
It does not cover OAuth2 nor OpenID protocols, but rather acts as an extension of these.

A client platform using ltilib will likely use some package such as node-oidc-provider to setup an
Authorization Server, while ltilib will just leverage its endpoints and services wherever it
relies on plain OAuth2 and/or OpenID services (i.e., for dynamic registration or authorization).

## Errors and Responses
Ltilib errors and success responses have `headers` and `httpStatusCode` fields. Success responses
may have the `content` field. These fields' values must be used to prepare the HTTP response of the
framework being used, since they are an essential piece of the LTI protocol.

### `HttpResponseWrapper`
Indicates a successful response that contains everything ready-to-go. All you need to do is prepare
your framework's HTTP response using all the data provided. Sometimes, a ltilib service may populate
the `rawContent` field with some output from which the `content` derives. Notice that `content`
contains the presented data and it's what you must send to the end-user or tool.

In this section, the most specific errors and response will be described such as their usages.

```ts
const res: HttpResponse; // e.g., express http response

// success response
const result: HttpResponseWrapper;
res.setHeaders(result.headers).status(result.httpStatusCode).send(result.content);
```

### Basic `LtilibError`
While most errors will inherit some context-aware error, some are not intended to be displayed
to the end-user, but to the client platform instead. These errors are simple `LtilibError`
instances or direct super classes. They only provide the `httpStatusCode` you should use
to handle the given error, but not a body, since the situation has not been stated by any
LTI specification.

It's up to the platform to decide whether it's going to display a plain JSON error describing what
went wrong or maybe render a view with a nice error page.

```ts
const error: LtilibError;
res.status(error.httpStatusCode).send(<YOUR CUSTOM BODY>);
```

### `OAuthError`
These errors follow OAuth protocol patterns for error responses. This is an abstract class
(and thus won't ever be directly instantiated). Every error that extends or implements it
will provide everything you need to generate a HTTP error response and also a `reason` code
that shortly describes what caused the error (within the context of the error, naturally).

Different from `HttpResponseWrapper`, it provides a `present` method instead of `content` or
`rawContent` fields.

```ts
const error: OAuthError;
res.setHeaders(error.headers).status(error.httpStatusCode).send(error.present());
```

### `InvalidArgumentError`
This is an abstract class and thus won't ever be directly instantiated. An invalid argument
error indicates that some LTI constraint has been violated. ltilib won't ever validate types,
but values instead. We expect you not to pass wrong types to our services, thus this scenario
constitutes undefined behavior.

It's not stated by any LTI specification how to handle a constraint violation. Therefore,
it's also up to the client platform whether to render it as a JSON or a HTML view.

Errors inheriting this class will always provide the `field` name (exactly as stated by the
respective LTI schema or exactly how set in the entity being validated if it's not oficially
described by any LTI specification) and a `reason` code that shortly describes what is wrong
with the given `field`'s value. It also provides a `message` field that describes in more
details what is wrong.

### `AuthenticationRedirectionError`
An authentication redirection error can only occur during the launch authentication process.
It provides the URL to which the end-user must be redirected (through `intoUrl` method) and
it's up to the platform to perform the redirection.

```ts
const error: AuthenticationRedirectionError;
res.redirect(error.intoUrl().toString());
```

## Client Platform Tests
Some of LTI specifications' requirements are too related to the HTTP gateway in such fashion that
it is not possible for ltilib to put up tests to ensure compliance. Therefore, there are some
integration tests that the client platform must do and guarantee they pass in order to keep
conformance:

### Assignment and Grade Service
```ts
describe("[LTI AGS 3.2.3] Line Item's ID must be compliant", () => {
    it("must be addressable for http GET, PUT and DELETE requests", () => {
        assert(false);
    });

    it("should be the base URL of score and result publishing and retrieval operations (respectively)", () => {
        assert(false);
    });
})
```
