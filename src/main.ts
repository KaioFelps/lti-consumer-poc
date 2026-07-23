import fs from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { RedisStore } from "connect-redis";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { json } from "express";
import { middleware as ejsLayoutsMiddleware } from "express-ejs-layouts";
import session from "express-session";
import { MockAgent, setGlobalDispatcher } from "undici";
import { AppModule } from "./app.module";
import { EnvironmentVars } from "./config/environment-vars";
import { Redis } from "./external/data-store/redis/client";
import { loadMessageStrings } from "./message-string/loader";

import "@/lib";
import { LtiAdvantageMediaType } from "$/advantage/media-types";

async function bootstrap() {
  expand(config({ override: false }));

  if (process.env.NODE_ENV !== "production") {
    // allow HTTPS request to untrusted TSL certificated URLs
    // (e.g.: the moodle container)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    // bypasses SSRF protection imposed by node-oidc-provider (for Moodle, specifically)
    const mockAgent = new MockAgent();
    const mockPool = mockAgent.get(/localhost|127\.0\.0\.1/);

    mockPool
      .intercept({
        path: /.*/,
        method: /.*/,
      })
      .reply(200, async (options) => {
        const targetUrl = `${options.origin}${options.path}`;
        const realResponse = await fetch(targetUrl, {
          method: options.method,
          headers: options.headers as Record<string, string>,
          body: options.body as BodyInit,
        });

        return await realResponse.text();
      })
      .persist();

    setGlobalDispatcher(mockAgent);
  }

  await loadMessageStrings();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
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

  app.useStaticAssets(join(__dirname, "../..", "public"));
  app.setBaseViewsDir(join(__dirname, "../..", "views"));
  app.setViewEngine("ejs");
  app.set("view options", {
    async: true,
  });

  app.use(ejsLayoutsMiddleware);

  // we need to register this otherwise LTI media types will
  // not be parsed as json
  app.use(
    json({
      type: [
        "application/json",
        LtiAdvantageMediaType.LineItem,
        LtiAdvantageMediaType.LineItemContainer,
      ],
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
