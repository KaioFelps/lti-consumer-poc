import { Context } from "$/core/context";

export interface LtiContextAdapter {
  getContext(): Context;
}
