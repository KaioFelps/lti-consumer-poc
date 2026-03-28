import { calculateLastPageFromPaginatedData } from "./calculate-last-page-from-paginated-data";
import {
  extractAgsConfiguration,
  extractAgsConfigurationAsTask,
} from "./extract-ags-configuration";
import {
  prepareContainerFullLinkHeader,
  prepareContainerLinkHeader,
} from "./prepare-container-link-header";

export default {
  extractAgsConfiguration,
  extractAgsConfigurationAsTask,
  prepareContainerLinkHeader,
  prepareContainerFullLinkHeader,
  calculateLastPageFromPaginatedData,
};
