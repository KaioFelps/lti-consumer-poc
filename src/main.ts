import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { RedisStore } from "connect-redis";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import session from "express-session";
import { AppModule } from "./app.module";
import { EnvironmentVars } from "./config/environment-vars";
import { Redis } from "./external/data-store/redis/client";
import { CoreValidationPipe } from "./lib/pipes/core-validation-pipe";
import { loadMessageStrings } from "./message-string/loader";

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
      secret: env.appSecret,
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

  app.useGlobalPipes(new CoreValidationPipe());

  app.useStaticAssets(join(__dirname, "../..", "public"));
  app.setBaseViewsDir(join(__dirname, "../..", "views"));
  app.setViewEngine("ejs");

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
