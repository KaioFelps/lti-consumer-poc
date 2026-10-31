import { Context } from "$/core/context.js";

export interface LtiContextAdapter<CustomContextType> {
  getContext(): Context<CustomContextType>;
}
