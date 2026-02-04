import { HttpStatus } from "@nestjs/common";
import { type Request, type Response, response } from "express";
import { User } from "@/modules/identity/user/user.entity";

// Making these aliases allow easier refactory or error search
// if switching to fastify at some point.
export type HttpRequest = Request;
export type HttpResponse = Response;

export type RequestSession = Record<string, unknown> & {
  flash: Record<string, unknown>;
  auth?: User;
};

(response as unknown as HttpResponse).redirectBack = function (
  status: HttpStatus = HttpStatus.SEE_OTHER,
) {
  const target = this.req.headers.referer ?? "/";
  return this.redirect(status, target);
};
