import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { RedisStore } from "connect-redis";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { middleware as ejsLayoutsMiddleware } from "express-ejs-layouts";
import session from "express-session";
import { AppModule } from "./app.module";
import { EnvironmentVars } from "./config/environment-vars";
import { Redis } from "./external/data-store/redis/client";
import { loadMessageStrings } from "./message-string/loader";

import "@/lib";

export const DEFAULT_EJS_LAYOUT = "layouts/main";

async function bootstrap() {
  expand(config());
  await loadMessageStrings();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
