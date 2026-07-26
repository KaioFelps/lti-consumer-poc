import { HttpStatus, SetMetadata } from "@nestjs/common";
import { HttpRequest } from "..";

const METADATA_KEY = "coreValidationErrorConfig";
const HANDLER_KEY = "__handler_core_validation_error_config";

export type CoreValidationConfig = {
  /**
   * When present, the error will be treated as a Renderable error and
   * this view will be rendered with the error data.
   */
  renderErrorsWithView?: string;
  /**
   * When present, this status will be forced into the response.
   */
  status?: HttpStatus;
  /**
   * When `false`, `unflatten` won't be called over the value. This means
   * dot-nested properties won't be expanded.
   *
   * @default true
   */
  shallUnflatten?: boolean;
};

export const ConfigCoreValidation = (config: CoreValidationConfig) => {
  return SetMetadata(METADATA_KEY, config);
};

function attachConfigsToRequest(request: HttpRequest, config: CoreValidationConfig = {}) {
  request[HANDLER_KEY] = config;
}

function getConfigsFromRequest(request: HttpRequest): CoreValidationConfig {
  return request[HANDLER_KEY];
}

export default {
  metadataKey: METADATA_KEY,
  requestKey: HANDLER_KEY,
  attachConfigsToRequest,
  getConfigsFromRequest,
};
