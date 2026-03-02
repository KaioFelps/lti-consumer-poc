/**
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0}
 */

import { faker } from "@faker-js/faker";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { createContext } from "ltilib/tests/common/factories/context.factory";
import {
  createFullLineItem,
  createMinimalLineItem,
} from "ltilib/tests/common/factories/line-item.factory";
import {
  createPlatform,
  createPlatformAgsConfiguration,
} from "ltilib/tests/common/factories/platform.factory";
import { createTool } from "ltilib/tests/common/factories/tool.factory";
import { Platform } from "$/core/platform";
import { PresentedLtiLineItem, presentLtiLineItem } from "./line-item.presenter";

const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

describe("[AGS] Line Item Presentation", async () => {
  const platform = await createPlatform();
  const context = createContext();
  const tool = createTool();

  let fullLineItem: PresentedLtiLineItem;
  let minimalLineItem: PresentedLtiLineItem;

  const createPresentedLineItemsWithPlatform = (platform: Platform) => {
    [fullLineItem, minimalLineItem] = [
      createFullLineItem({ context, tool }),
      createMinimalLineItem(),
    ].map((lineitem) =>
      pipe(
        presentLtiLineItem(lineitem, context, platform),
        e.getOrElseW(() => {
          throw new Error("`Platform` must have AGS enabled for line item presentation tests");
        }),
      ),
    );
  };

  beforeEach(() => {
    createPresentedLineItemsWithPlatform(platform);
  });

  describe("[3.2.3] Line item ID must be compliant", () => {
    it("must be a fully qualified URL", () => {
      expect(() => new URL(fullLineItem.id)).not.toThrowError();
    });
  });

  describe("[3.2.7] `label`", () => {
    it("should always be included when line item is presented", () => {
      assert(fullLineItem.label);
      assert(minimalLineItem.label);
    });
  });

  it("[3.2.10] should omit `resourceId` if it is nullish", () => {
    expect(minimalLineItem.resourceId).toBeUndefined();
    expect(fullLineItem.resourceId).not.toBeUndefined();
  });

  it("[3.2.11] should omit `tag` field when nullish", () => {
    expect(minimalLineItem.tag).toBeUndefined();
    expect(fullLineItem.tag).not.toBeUndefined();
  });

  describe("[3.2.{12,13}] `startDateTime` & `endDateTime", async () => {
    const platformWithDeadlines = await createPlatform({
      agsConfiguration: createPlatformAgsConfiguration({
        deadlinesEnabled: { end: true, start: true },
      }),
    });

    beforeEach(() => {
      createPresentedLineItemsWithPlatform(platformWithDeadlines);
    });

    it("should be presented in valid ISO 8601 format", () => {
      expect(fullLineItem.startDateTime).toMatch(iso8601Regex);
      if (fullLineItem.endDateTime) expect(fullLineItem.endDateTime).toMatch(iso8601Regex);
    });

    it("should be presented with a time zone designator", () => {
      expect(fullLineItem.startDateTime).toContain("T");
      if (fullLineItem.endDateTime) expect(fullLineItem.endDateTime).toContain("T");
    });

    it("[4.2] should be in UTC", () => {
      expect(fullLineItem.startDateTime).toContain("Z");
      if (fullLineItem.endDateTime) expect(fullLineItem.endDateTime).toContain("Z");
    });

    it("should be omitted if the platform does not support this functionality", async () => {
      const deadlinesFeature = [
        { end: true, start: false },
        { end: false, start: true },
        { end: true, start: true },
      ];

      for (const deadlinesEnabled of deadlinesFeature) {
        const platformWithoutStartNorEndDateTimesFeature = await createPlatform({
          agsConfiguration: createPlatformAgsConfiguration({
            deadlinesEnabled,
          }),
        });

        createPresentedLineItemsWithPlatform(platformWithoutStartNorEndDateTimesFeature);

        if (!deadlinesEnabled.start) expect(fullLineItem.startDateTime).toBeUndefined();
        if (!deadlinesEnabled.end) expect(fullLineItem.endDateTime).toBeUndefined();
      }
    });

    it("should be presented as `null` if line item doesn't have such value but this feature is supported", async () => {
      const deadlinesFeature = [
        { end: true, start: false },
        { end: false, start: true },
        { end: true, start: true },
      ];

      for (const deadlinesEnabled of deadlinesFeature) {
        const platformWithStartAndEndFeaturesEnabled = await createPlatform({
          agsConfiguration: createPlatformAgsConfiguration({ deadlinesEnabled }),
        });

        createPresentedLineItemsWithPlatform(platformWithStartAndEndFeaturesEnabled);

        if (deadlinesEnabled.start) expect(minimalLineItem.startDateTime).toBeNull();
        if (deadlinesEnabled.end) expect(minimalLineItem.endDateTime).toBeNull();
      }
    });
  });

  it("should present extensions", () => {
    const customParameters = {
      "https://www.toolexample.com/lti/score": {
        originality: 94,
        submissionUrl: "https://www.toolexample.com/lti/score/54/5893/essay.pdf",
      },
      "https://test.mytool.foo/my/valid/key": true,
    } as const;

    const lineItemWithExtensions = createMinimalLineItem({ customParameters });

    const _presented = presentLtiLineItem<typeof customParameters>(
      lineItemWithExtensions,
      context,
      platform,
    );
    assert(e.isRight(_presented));
    const presentedLineItemWithExtensions = _presented.right;

    expect(presentedLineItemWithExtensions["https://test.mytool.foo/my/valid/key"]).toBe(true);
    expect(presentedLineItemWithExtensions["https://www.toolexample.com/lti/score"]).toMatchObject(
      customParameters["https://www.toolexample.com/lti/score"],
    );
  });

  it("should present decimal `scoreMaximum`s as is", async () => {
    const decimal = faker.number.float({ min: 1.5, max: 100 });
    const lineItemWithDecimalScoreMaximum = createMinimalLineItem({ scoreMaximum: decimal });
    const _presented = presentLtiLineItem(lineItemWithDecimalScoreMaximum, context, platform);
    assert(e.isRight(_presented));
    const presentedLineItem = _presented.right;

    expect(presentedLineItem.scoreMaximum).toBe(decimal);
  });
});
