import path from "node:path";
import FastGlob from "fast-glob";

const isCompiled = __dirname.includes("dist");

export async function loadMessageStrings() {
  const projectRoot = path.resolve(__dirname, isCompiled ? ".." : ".");

  const pattern = isCompiled
    ? path.join(projectRoot, "**/strings/*.js")
    : path.join(projectRoot, "**/strings/*.ts");

  const files = await FastGlob([pattern], { absolute: true });
  const promises = files.map((file) => import(file));
  Promise.all(promises);
}
