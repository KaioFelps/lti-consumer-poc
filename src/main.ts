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
import { AppModule } from "./app.module.js";
import { EnvironmentVars } from "./config/environment-vars.js";
import { Redis } from "./external/data-store/redis/client.js";
import { loadMessageStrings } from "./message-string/loader.js";

import "@/lib.js";
import ejs from "ejs";
import type { HttpResponse } from "@/lib.js";
import { LtiAdvantageMediaType } from "$/advantage/media-types.js";

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
    // closes SSE connections upon kill/exit signals
    // without this, sse connections will keep reconnecting and the server wont shutdown
    forceCloseConnections: true,
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

  app.useStaticAssets(join(import.meta.dirname, "../..", "public"));
  app.setBaseViewsDir(join(import.meta.dirname, "../..", "views"));

  app.engine("ejs", (file: string, data: ejs.Data, cb: (err: unknown, html?: string) => void) => {
    ejs
      .renderFile(file, data, {
        async: true,
        views: data.settings?.views,
        cache: !!data.settings?.["view cache"],
      })
      .then((html) => cb(null, html), cb);
  });
  app.setViewEngine("ejs");
  app.use(ejsLayoutsMiddleware);

  let _counter = 0;

  app.use((req, _res: HttpResponse, next) => {
    const counter = _counter++;
    console.log(`\n========== INCOMING REQUEST (${counter}) ==========`);
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));

    let rawBody = "";
    req.on("data", (chunk) => {
      (rawBody as unknown as number) += chunk;
    });
    req.on("end", () => {
      console.log("Raw body:", rawBody || "(vazio)");
      console.log("=======================================\n");
    });

    next();
  });

  // we need to register this otherwise LTI media types will
  // not be parsed as json
  app.use(
    json({
      type: [
        "application/json",
        LtiAdvantageMediaType.Score,
        LtiAdvantageMediaType.LineItem,
        LtiAdvantageMediaType.LineItemContainer,
        LtiAdvantageMediaType.ResultContainer,
      ],
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
