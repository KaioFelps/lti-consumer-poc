# Async Render

By default, layouts would not render with `async: true` EJS option — perhaps because of express-ejs-layouts package.
The the package (nest-express-ejs-layouts) is a rewrite of the former packaeg with async support, and it
provides a standalone `renderWithLayout` function that can be used within an interceptor to mimic behavior of
the middleware from the original package.

This module provides a `@RenderAsync` decorator and an interceptor using that function that behaves just like
NestJs `@Render` decorator with the express-ejs-layouts without asynchronism. Asynchronism allowed to move
translations from controllers to views.

The new package provides a middleware that internally uses the `renderWithLayout` function and act just like
the old package's middleware, so there is no need to use anything provided from this module at all, but yet
it stays as an example of an alternative to the middleware and for study purposes.
