/**
 * Many invariants must persist across update, but as `update` calls require
 * `LtiScore` instances, it's true that most of things has been validated already.
 */

import { either as e } from "fp-ts";
import scoreFactory from "ltilib/tests/common/factories/score.factory";
import * as validatorMod from "$/advantage/utils/validate-lti-iso-8601-precise-timestamp";
import { InvalidScoreArgumentError } from "$/assignment-and-grade/errors";
import { LtiScore } from ".";

describe("[AGS] Scores domain's rules", () => {
  test("timestamps are validated using validateLtiIso8601AndPreciseTimestamp helper", () => {
    const validation = vi.spyOn(validatorMod, "validateLtiIso8601AndPreciseTimestamp");
    const amountOfTimestampsToBeValidated = 3; // timestamp, startedAt & submittedAt

    const _score = scoreFactory.createScore({
      timestamp: new Date().toISOString(),
      submission: {
        startedAt: new Date(Date.now() + 100).toISOString(),
        submittedAt: new Date(Date.now() + 500).toISOString(),
      },
    });

    expect(validation).toHaveBeenCalledTimes(amountOfTimestampsToBeValidated);
  });

  describe("scoreMaximum", () => {
    it("must be positive", () => {
      const newScore = LtiScore.create({
        ...scoreFactory.createScore(),
        score: { given: 0, maximum: 0 },
      });
      assert(e.isLeft(newScore));
      expect(newScore.left).toBeInstanceOf(InvalidScoreArgumentError);
      expect(newScore.left.field).toBe("scoreMaximum");
      expect(newScore.left.reason).toBe("must_be_greater_than_zero");
    });

    it("must be present when scoreGiven is present", () => {
      const newScore = LtiScore.create({
        ...scoreFactory.createScore(),
        score: { given: 10 },
      });
      assert(e.isLeft(newScore));
      expect(newScore.left).toBeInstanceOf(InvalidScoreArgumentError);
      expect(newScore.left.field).toBe("scoreMaximum");
      expect(newScore.left.reason).toBe("required");
    });
  });

  describe("scoreGiven", () => {
    it("must be non-negative", () => {
      const newScore = LtiScore.create({
        ...scoreFactory.createScore(),
        score: { given: -1, maximum: 1 },
      });
      assert(e.isLeft(newScore));
      expect(newScore.left).toBeInstanceOf(InvalidScoreArgumentError);
      expect(newScore.left.field).toBe("scoreGiven");
      expect(newScore.left.reason).toBe("must_be_equal_or_greater_than_zero");
    });

    it("should be able to be bigger than scoreMaximum", () => {
      const newScore = LtiScore.create({
        ...scoreFactory.createScore(),
        score: { given: 1.3, maximum: 1 },
      });

      assert(e.isRight(newScore));
      expect(newScore.right.score?.given).toBe(1.3);
      expect(newScore.right.score?.maximum).toBe(1);
    });
  });

  describe("update", () => {
    // no errors, just ignore everything
    it("should ignore the incoming score if its timestamp is older", () => {
      const now = Date.now();
      const currentScore = scoreFactory.createScore({ timestamp: new Date(now) });
      const newScore = scoreFactory.createScore({
        timestamp: new Date(now - 1),
        score: { given: 10, maximum: 10 },
        activityProgress: LtiScore.ActivityProgress.Completed,
        gradingProgress: LtiScore.GradingProgress.FullyGraded,
        comment: "foo",
        submission: {
          startedAt: new Date(now + 10),
          submittedAt: new Date(now + 50),
        },
        userId: currentScore.userId,
        customParameters: { "https://foo.com/bar": true },
      });

      assert(e.isLeft(currentScore.update(newScore)));
      expect(currentScore.timestamp).not.toEqual(newScore.timestamp);
      expect(currentScore.score).not.toEqual(newScore.score);
      expect(currentScore.activityProgress).not.toEqual(newScore.activityProgress);
      expect(currentScore.gradingProgress).not.toEqual(newScore.gradingProgress);
      expect(currentScore.comment).not.toEqual(newScore.comment);
      expect(currentScore.submission).not.toEqual(newScore.submission);
      expect(currentScore.customParameters).not.toEqual(newScore.customParameters);
    });

    it("should clear the score (scoreGiven) when nullish", () => {
      const existingScore = scoreFactory.createScore({ score: { given: 0.6, maximum: 1 } });
      const newScore = LtiScore.create({
        ...scoreFactory.createScore(),
        score: { given: undefined, maximum: 1 },
      });
      assert(e.isRight(newScore));
      assert(e.isRight(existingScore.update(newScore.right)));
      expect(existingScore.score).toBeUndefined();
    });

    describe("comment", () => {
      it("should be cleared the it's undefined", () => {
        const currentScore = scoreFactory.createScore({ comment: "bar" });
        const newScore = scoreFactory.createScore({ comment: undefined });

        expect(currentScore.comment).not.toBeUndefined();
        assert(e.isRight(currentScore.update(newScore)));
        expect(currentScore.comment).toBeUndefined();
      });

      it("should be kept it if it's null", () => {
        const currentScore = scoreFactory.createScore({ comment: "bar" });
        const newScore = scoreFactory.createScore({ comment: null });
        console.log(newScore);
        assert(e.isRight(currentScore.update(newScore)));
        expect(currentScore.comment).toBe("bar");
      });

      it("should overwrite if present", () => {
        const currentScore = scoreFactory.createScore({ comment: "bar" });
        const newScore = scoreFactory.createScore({ comment: "foo" });
        assert(e.isRight(currentScore.update(newScore)));
        expect(currentScore.comment).toBe("foo");
      });
    });
  });
});
