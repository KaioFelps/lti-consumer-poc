import type { HttpRequest } from "@/lib.js";
import mvc from "../mvc-routes.js";
import { ExceptionFilterResponder } from "./responder.js";

export abstract class ExceptionFilterResponderFactory<B = unknown, O = unknown> {
  protected isMVC(request: HttpRequest): boolean {
    return request[mvc.requestKey] ?? false;
  }

  public abstract create(request: HttpRequest): ExceptionFilterResponder<B, O>;
}
