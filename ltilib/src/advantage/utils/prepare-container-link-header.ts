import { JsonPrimitive } from "common/src/types/json-value";
import { LtiRepositoryPaginatedResponse } from "$/core/repositories";
import { calculateLastPageFromPaginatedData } from "./calculate-last-page-from-paginated-data";

const nonNullables = <T>(entry: [string, T]): entry is [string, NonNullable<T>] => {
  return typeof entry[1] !== "undefined" && entry[1] !== null && entry[1] !== "";
};

type Relation = "next" | "prev" | "first" | "last";

type FiltersObject = Record<PropertyKey, JsonPrimitive | undefined>;

export function prepareContainerLinkHeader(
  filters: FiltersObject,
  page: number,
  endpointUrl: URL,
  rel: Relation = "next",
) {
  const normalizedValues = Object.entries({ ...filters, page })
    .filter(nonNullables)
    .map(([key, value]) => [key, value.toString()]);

  const searchParams = new URLSearchParams(Object.fromEntries(normalizedValues));
  const nextPageUrl = new URL(endpointUrl);
  nextPageUrl.search = searchParams.toString();

  return `<${nextPageUrl.toString()}>; rel="${rel}"`;
}

export function prepareContainerFullLinkHeader(
  filters: FiltersObject,
  containerEndpoint: URL,
  currentPage: number,
  paginatedResponse: LtiRepositoryPaginatedResponse<unknown>,
  limit: number,
) {
  const nextPage = currentPage + 1;
  const prevPage = Math.max(1, currentPage - 1);
  const lastPage = calculateLastPageFromPaginatedData(paginatedResponse, limit);

  const links: string[] = [];

  links.push(prepareContainerLinkHeader(filters, 1, containerEndpoint, "first"));
  links.push(prepareContainerLinkHeader(filters, lastPage, containerEndpoint, "last"));

  const hasNextPage = currentPage * limit < paginatedResponse.count;
  const hasPreviousPage = prevPage !== currentPage;

  if (hasNextPage) {
    const nextPageLink = prepareContainerLinkHeader(filters, nextPage, containerEndpoint, "next");
    links.push(nextPageLink);
  }

  if (hasPreviousPage) {
    const prevPageLink = prepareContainerLinkHeader(filters, prevPage, containerEndpoint, "prev");
    links.push(prevPageLink);
  }

  return links.join(",");
}
