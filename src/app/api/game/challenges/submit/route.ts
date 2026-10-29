import { NextResponse, type NextRequest } from "next/server";
import { handleApi, parseBody, requireUser } from "@/server/http";
import { submitChallengeSchema } from "@/lib/schemas";
import { submitChallenge } from "@/server/services/content";
import { processLearningEvent } from "@/server/services/reward";
import { syncSkillProgress } from "@/server/services/mastery";
import { recordQuestProgress } from "@/server/services/quest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { challengeId, submittedWorkReference, idempotencyKey } =
      await parseBody(req, submitChallengeSchema);

    const { attempt, result, feedback, xpAwarded } =
      await submitChallenge(
        user.id,
        challengeId,
        submittedWorkReference ?? null,
      );

    // Award XP exactly once for a passing challenge.
    const reward =
      result === "PASS"
        ? await processLearningEvent({
            userId: user.id,
            eventType: "challenge_pass",
            eventId: `challenge-${challengeId}-${idempotencyKey}`,
            reason: `Completed challenge ${challengeId}`,
            challengeId,
            topicId: attempt.challengeId,
          })
        : { xpAwarded: 0, leveledUp: false, previousLevel: 0, newLevel: 0, progress: null as any, alreadyAwarded: false };

    const challenge = await import("@/server/services/content").then(
      (m) => m.getChallenge(challengeId),
    );
    if (challenge.relatedConcepts && Array.isArray(challenge.relatedConcepts)) {
      for (const concept of challenge.relatedConcepts) {
        await syncSkillProgress(user.id, String(concept)).catch(() => {});
        await recordQuestProgress(user.id, "", "challenge", String(concept)).catch(() => {});
      }
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        result,
        feedback,
        xpAwarded: attempt.xpAwarded,
        completedAt: attempt.completedAt,
      },
      reward: {
        xpAwarded: reward.xpAwarded,
        leveledUp: reward.leveledUp,
        previousLevel: reward.previousLevel,
        newLevel: reward.newLevel,
        alreadyAwarded: reward.alreadyAwarded,
      },
    });
  });
}
