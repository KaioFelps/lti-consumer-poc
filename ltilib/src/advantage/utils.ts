import { calculateLastPageFromPaginatedData } from "./utils/calculate-last-page-from-paginated-data.js";
import {
  extractAgsConfiguration,
  extractAgsConfigurationAsTask,
} from "./utils/extract-ags-configuration.js";
import {
  prepareContainerFullLinkHeader,
  prepareContainerLinkHeader,
} from "./utils/prepare-container-link-header.js";

export default {
  extractAgsConfiguration,
  extractAgsConfigurationAsTask,
  prepareContainerLinkHeader,
  prepareContainerFullLinkHeader,
  calculateLastPageFromPaginatedData,
};
