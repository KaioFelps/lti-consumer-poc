import { faker } from "@faker-js/faker";
import {
  prepareContainerFullLinkHeader,
  prepareContainerLinkHeader,
} from "./prepare-container-link-header";

describe("LTI Containers Link Header Values Generators", () => {
  const endpointUrl = new URL("ctx/59", faker.internet.url({ protocol: "https" }));

  /**
   * Validates a single item of a Link header.
   */
  const BASIC_LINK_ELEMENT_REGEX =
    /^<[^>]+>;\s*rel="[a-zA-Z0-9\s]+"|(?:\s*;\s*[a-z]+=(?:"[^"]+"|[a-zA-Z0-9]+))*$/;
  const LINK_URI_REF_REGEX = /<([^>]+)>/;
  const LINK_REL_REGEX = /rel="([^"]+)"/;

  const extractUrl = (value: string) => {
    const uri = value.match(LINK_URI_REF_REGEX);
    expect(value, "tried to extract URL from an invalid string").not.toBeNull();
    return new URL(uri![1]);
  };

  describe("prepareContainerLinkHeader", () => {
    it("should generate RFC 8288 conformant values", () => {
      const filters = { foo: true, bar: 10, baz: "baz" };
      const value = prepareContainerLinkHeader(filters, 1, endpointUrl);

      const uri = value.match(LINK_URI_REF_REGEX);
      const rel = value.match(LINK_REL_REGEX);

      expect(value).toMatch(BASIC_LINK_ELEMENT_REGEX);
      expect(uri, "it should have the uri reference markers").not.toBeNull();
      expect(rel, "it should have the 'rel' attribute").not.toBeNull();
      expect(
        () => new URL(uri![1]),
        "a valid URL should be placed within URI reference angles",
      ).not.toThrow();
    });

    it("should strip null, explicit undefined or empty values from search parameters", () => {
      const filters = { foo: null, bar: undefined, baz: "" };
      const value = prepareContainerLinkHeader(filters, 1, endpointUrl);
      const url = extractUrl(value);
      expect(url.searchParams.size, "it should only have 'page' search parameter set").toBe(1);
    });

    it("should not strip 0 as nullish", () => {
      const filters = { foo: 0 };
      const value = prepareContainerLinkHeader(filters, 1, endpointUrl);
      const url = extractUrl(value);
      expect(url.searchParams.get("foo")).toBe(String(0));
    });

    it("should stringify values when preparing the search parameters", () => {
      const filters = { bool: true, num: 10 };
      const value = prepareContainerLinkHeader(filters, 1, endpointUrl);
      const url = extractUrl(value);

      for (const [key] of Object.entries(filters)) {
        expect(typeof url.searchParams.get(key)).toBe("string");
      }
    });

    it.each(["next", "prev", "last", "first"] as const)(
      "should correctly set given `rel` values",
      (rel) => {
        const filters = { bool: true, num: 10 };
        const value = prepareContainerLinkHeader(filters, 1, endpointUrl, rel);
        const finalRel = value.match(LINK_REL_REGEX);

        expect(finalRel, "it should have set the attribute `rel`").not.toBeNull();
        expect(finalRel![1]).toBe(rel);
      },
    );

    it.each([{ foo: true, bar: 10, baz: "baz" }, { foo: true }, {}])(
      "should persist given filters within search parameters of the generated URL",
      (filters) => {
        const value = prepareContainerLinkHeader(filters, 1, endpointUrl);

        const uri = value.match(LINK_URI_REF_REGEX);
        const getUriAsUrl = () => new URL(uri![1].toString());
        expect(getUriAsUrl, "uri should be a valid URL").not.toThrow();
        const url = getUriAsUrl();

        for (const [key, value] of Object.entries(filters)) {
          expect(url.searchParams.get(key)).toEqual(value.toString());
        }
      },
    );

    it("should correctly handle empty filters", () => {
      const ARBITRARY_PAGE = 10;
      const value = prepareContainerLinkHeader({}, ARBITRARY_PAGE, endpointUrl);
      const url = extractUrl(value);
      expect(url.searchParams.size, "it should only have set the 'page' parameter").toBe(1);
    });

    it("should persist the current page in the search parameters", () => {
      const ARBITRARY_PAGE = 10;
      const value = prepareContainerLinkHeader({}, ARBITRARY_PAGE, endpointUrl);
      const url = extractUrl(value);
      expect(url.searchParams.get("page")).toBe(ARBITRARY_PAGE.toString());
    });
  });

  describe("prepareContainerFullLinkHeader", () => {
    const getLinkHeader = (page: number, count: number, limit: number) =>
      prepareContainerFullLinkHeader(
        {},
        endpointUrl,
        page,
        { count, values: Array.of(count) },
        limit,
      );

    const extractLinks = (value: string) => value.split(",");

    const extractRel = (value: string) => {
      const rel = value.match(LINK_REL_REGEX);
      expect(rel, "tried to extract rel from a RFC 8288 non-conformant value").not.toBeNull();
      return rel![1];
    };

    it("should outputs a comma-separated list of valid links per RFC 8288", () => {
      const linkHeader = getLinkHeader(2, 100, 12);
      expect(linkHeader.includes(","), "it should be a comma-separated list").toBeTruthy();

      const values = linkHeader.split(",").map((v) => v.trim());
      values.forEach((value) => expect(value).toMatch(BASIC_LINK_ELEMENT_REGEX));
    });

    it("should include a 'next' link when it's not the last page", () => {
      const linkHeader = getLinkHeader(1, 20, 19);
      const links = extractLinks(linkHeader);
      const nextLink = links.find((link) => extractRel(link) === "next");
      expect(nextLink).not.toBeNullable();
    });

    it("should omit 'next' link when it's the last page", () => {
      const linkHeader = getLinkHeader(1, 20, 20);
      const links = extractLinks(linkHeader);
      const nextLink = links.find((link) => extractRel(link) === "next");
      expect(nextLink).toBeNullable();
    });

    it("should include a 'prev' link when current page is not the first", () => {
      const linkHeader = getLinkHeader(2, 20, 10);
      const links = extractLinks(linkHeader);
      const nextLink = links.find((link) => extractRel(link) === "prev");
      expect(nextLink).not.toBeNullable();
    });

    it("should omit 'prev' link when current page is the first", () => {
      const linkHeader = getLinkHeader(1, 20, 10);
      const links = extractLinks(linkHeader);
      const nextLink = links.find((link) => extractRel(link) === "prev");
      expect(nextLink).toBeNullable();
    });

    it("should include 'last' and 'first' links", () => {
      // first and last page, but should have last and first links either way
      const linkHeader = getLinkHeader(1, 20, 20);
      const links = extractLinks(linkHeader);
      const firstLink = links.find((link) => extractRel(link) === "first");
      const lastLink = links.find((link) => extractRel(link) === "last");

      expect(firstLink).not.toBeNullable();
      expect(lastLink).not.toBeNullable();
    });

    it("should point 'last' to page 1 when count is 0", () => {
      const linkHeader = getLinkHeader(1, 0, 10);
      const lastLink = extractLinks(linkHeader).find((link) => extractRel(link) === "last");
      const url = extractUrl(lastLink!);

      expect(url.searchParams.get("page")).toBe("1");
    });

    it("should point 'first' to page 1 when count is 0", () => {
      const linkHeader = getLinkHeader(1, 0, 10);
      const lastLink = extractLinks(linkHeader).find((link) => extractRel(link) === "first");
      const url = extractUrl(lastLink!);

      expect(url.searchParams.get("page")).toBe("1");
    });
  });
});
