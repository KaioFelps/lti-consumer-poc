import fs from "node:fs";
import { join } from "node:path";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule } from "@nestjs/testing";
import { RedisStore } from "connect-redis";
import cookieParser from "cookie-parser";
import { json } from "express";
import { middleware as ejsLayoutsMiddleware } from "express-ejs-layouts";
import session from "express-session";
import { EnvironmentVars } from "@/config/environment-vars";
import { Redis } from "@/external/data-store/redis/client";
import { LtiAdvantageMediaType } from "$/advantage/media-types";

export async function getTestingApp() {
  // we cannot import it normally because it would load the AppConfigModule and its dependencies
  // before we have a chance to inject the environment variables from the e2e tests setup file.
  //
  // nestjs modules are resolved upon import, even before the app actually is raised. Not every
  // module, tbf, but the ones using methods like `forRoot` or `forFeature` do get resolved immediately.
  const { AppModule } = await import("@/app.module");
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>({
    httpsOptions: {
      key: fs.readFileSync(join(process.cwd(), "certs", "localhost-key.pem")),
      cert: fs.readFileSync(join(process.cwd(), "certs", "localhost.pem")),
    },
  });

  const redis = app.get(Redis);
  const env = app.get(EnvironmentVars);

  app.enableShutdownHooks();
  app.use(cookieParser());
  app.use(
    session({
      name: "lti_consumer_poc_session",
      secret: env.app.secret,
      resave: false,
      saveUninitialized: false,
      store: new RedisStore({ client: redis.client }),
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      },
    }),
  );

  app.useStaticAssets(join(process.cwd(), "public"));
  app.setBaseViewsDir(join(process.cwd(), "views"));
  app.setViewEngine("ejs");
  app.set("view options", {
    async: true,
  });

  app.use(ejsLayoutsMiddleware);

  app.use(
    json({
      type: [
        "application/json",
        LtiAdvantageMediaType.LineItem,
        LtiAdvantageMediaType.LineItemContainer,
      ],
    }),
  );

  return app;
}
