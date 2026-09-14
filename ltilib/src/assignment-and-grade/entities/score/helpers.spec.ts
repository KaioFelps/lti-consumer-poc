import scoreFactory from "ltilib/tests/common/factories/score.factory";
import { LtiScore } from ".";
import { resolveSubmission } from "./helpers";

describe("[AGS] Score's helpers", () => {
  describe("resolveSubmission", () => {
    const now = new Date();

    describe("startedAt", () => {
      const activityProgressesThatDoesntReset = [
        LtiScore.ActivityProgress.Started,
        LtiScore.ActivityProgress.InProgress,
        LtiScore.ActivityProgress.Submitted,
        LtiScore.ActivityProgress.Completed,
      ];

      it("should use the last value it received", () => {
        const scoreWithExistingStartedAt = scoreFactory.createScore({
          activityProgress: LtiScore.ActivityProgress.Started,
          submission: { startedAt: now },
        });

        const newScoreWithoutStartedAt = scoreFactory.createScore({
          activityProgress: activityProgressesThatDoesntReset[0],
          submission: {},
        });

        const result = resolveSubmission.call(
          scoreWithExistingStartedAt,
          newScoreWithoutStartedAt.submission,
          newScoreWithoutStartedAt.activityProgress,
          new Date(newScoreWithoutStartedAt.timestamp),
        );

        expect(result?.startedAt).toEqual(scoreWithExistingStartedAt.submission?.startedAt);
      });

      it("should be cleared if activityProgress is set back to Initialized", () => {
        const existingAndInProgressScore = scoreFactory.createScore({
          activityProgress: LtiScore.ActivityProgress.InProgress,
          submission: { startedAt: new Date(now.getTime() - 200) },
          timestamp: new Date(now.getTime() - 500),
        });
        const newInitializedScore = scoreFactory.createScore({
          activityProgress: LtiScore.ActivityProgress.Initialized,
        });

        const result = resolveSubmission.call(
          existingAndInProgressScore,
          newInitializedScore.submission,
          newInitializedScore.activityProgress,
          new Date(newInitializedScore.timestamp),
        );

        expect(result.startedAt).toBeUndefined();
      });

      it.each([
        scoreFactory.createScore({
          activityProgress: LtiScore.ActivityProgress.InProgress,
          timestamp: now,
        }),
        scoreFactory.createScore({
          activityProgress: LtiScore.ActivityProgress.Started,
          timestamp: now,
        }),
      ])(
        "should resolve to the timestamp of the first score event of activityProgress of Started or InProgress if not present",
        (firstScoreStartedOrInitialized) => {
          const initialTimestamp = new Date(now.getTime() - 100);
          const initialScore = scoreFactory.createScore({
            timestamp: initialTimestamp,
            activityProgress: LtiScore.ActivityProgress.Initialized,
          });

          for (const activityProgress of activityProgressesThatDoesntReset) {
            const lastScoreWithoutStartedAt = scoreFactory.createScore({
              activityProgress,
            });

            let result = resolveSubmission.call(
              initialScore,
              firstScoreStartedOrInitialized.submission,
              firstScoreStartedOrInitialized.activityProgress,
              new Date(firstScoreStartedOrInitialized.timestamp),
            );

            const intermediaryScore = scoreFactory.createScore({
              ...firstScoreStartedOrInitialized,
              submission: result,
            });

            result = resolveSubmission.call(
              intermediaryScore,
              lastScoreWithoutStartedAt.submission,
              lastScoreWithoutStartedAt.activityProgress,
              new Date(lastScoreWithoutStartedAt.timestamp),
            );

            expect(result.startedAt).toEqual(firstScoreStartedOrInitialized.timestamp);
          }
        },
      );
    });

    describe("submittedAt", () => {
      const activityProgressThatShouldReset = [
        LtiScore.ActivityProgress.Initialized,
        LtiScore.ActivityProgress.Started,
        LtiScore.ActivityProgress.InProgress,
      ];

      const activityProgressesThatDoesntReset = [
        LtiScore.ActivityProgress.Completed,
        LtiScore.ActivityProgress.Submitted,
      ];

      it.each(activityProgressThatShouldReset)(
        "should be cleared when activityProgress is $0",
        (resettingProgress) => {
          const existingAndInProgressScore = scoreFactory.createScore({
            activityProgress: activityProgressesThatDoesntReset[0],
            submission: { startedAt: new Date(now.getTime() - 200) },
            timestamp: new Date(now.getTime() - 500),
          });

          const newInitializedScore = scoreFactory.createScore({
            activityProgress: resettingProgress,
          });

          const result = resolveSubmission.call(
            existingAndInProgressScore,
            newInitializedScore.submission,
            newInitializedScore.activityProgress,
            new Date(newInitializedScore.timestamp),
          );

          expect(result.submittedAt).toBeUndefined();
        },
      );

      it("should use the last value if not present", () => {
        const scoreWithExistingStartedAt = scoreFactory.createScore({
          activityProgress: LtiScore.ActivityProgress.Started,
          submission: { startedAt: now, submittedAt: new Date(now.getTime() + 200) },
        });

        const newScoreWithoutStartedAt = scoreFactory.createScore({
          activityProgress: activityProgressesThatDoesntReset[0],
          submission: {},
        });

        const result = resolveSubmission.call(
          scoreWithExistingStartedAt,
          newScoreWithoutStartedAt.submission,
          newScoreWithoutStartedAt.activityProgress,
          new Date(newScoreWithoutStartedAt.timestamp),
        );

        expect(result?.submittedAt).toEqual(scoreWithExistingStartedAt.submission?.submittedAt);
      });

      it.each([
        scoreFactory.createScore({
          activityProgress: LtiScore.ActivityProgress.Submitted,
          timestamp: now,
        }),
        scoreFactory.createScore({
          activityProgress: LtiScore.ActivityProgress.Completed,
          timestamp: now,
        }),
      ])(
        "should use the timestamp of the 1st score with activityProgress of $activityProgress if not present",
        (scoreToKeepSubmission) => {
          // it either resets or sets, there is no "keep" operation in this case, since
          // activityProgressThatShouldReset ∪ activityProgressesThatDoesntReset = ActivityProgress set

          const initialTimestamp = new Date(now.getTime() - 100);
          const initialScore = scoreFactory.createScore({
            timestamp: initialTimestamp,
            activityProgress: LtiScore.ActivityProgress.Initialized,
          });

          let result = resolveSubmission.call(
            initialScore,
            scoreToKeepSubmission.submission,
            scoreToKeepSubmission.activityProgress,
            new Date(scoreToKeepSubmission.timestamp),
          );

          expect(result.submittedAt).toEqual(scoreToKeepSubmission.timestamp);
          const resultantScore = scoreFactory.createScore({
            ...scoreToKeepSubmission,
            submission: result,
          });

          // should not overwrite, but keep the timestamp of the first since there ain't no new submittedAt
          // timestamp.
          const overwritingScore = scoreFactory.createScore({
            activityProgress: activityProgressesThatDoesntReset[0],
            timestamp: new Date(now.getTime() + 300),
            submission: {},
          });

          result = resolveSubmission.call(
            resultantScore,
            overwritingScore.submission,
            overwritingScore.activityProgress,
            new Date(overwritingScore.timestamp),
          );

          expect(result.submittedAt).toEqual(scoreToKeepSubmission.timestamp);
        },
      );
    });
  });
});
