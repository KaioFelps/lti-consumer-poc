import { Context } from "$/core/context";

export interface LtiContextAdapter<CustomContextType> {
  getContext(): Context<CustomContextType>;
}
