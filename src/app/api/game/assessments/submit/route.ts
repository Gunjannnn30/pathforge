import { NextResponse, type NextRequest } from "next/server";
import { handleApi, parseBody, requireUser } from "@/server/http";
import { submitAssessmentSchema } from "@/lib/schemas";
import { submitAssessment } from "@/server/services/content";
import { processLearningEvent } from "@/server/services/reward";
import { syncSkillProgress } from "@/server/services/mastery";
import { recordQuestProgress } from "@/server/services/quest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { assessmentId, answers, idempotencyKey } = await parseBody(
      req,
      submitAssessmentSchema,
    );

    const { attempt, score, passed, feedback, questionFeedback } =
      await submitAssessment(user.id, assessmentId, answers);

    // Award XP exactly once if passed.
    const reward = passed
      ? await processLearningEvent({
          userId: user.id,
          eventType: "assessment_pass",
          eventId: `assessment-${assessmentId}-${idempotencyKey}`,
          reason: `Passed assessment ${assessmentId}`,
          assessmentId,
          topicId: attempt.assessmentId,
        })
      : {
          xpAwarded: 0,
          leveledUp: false,
          previousLevel: 0,
          newLevel: 0,
          progress: null as any,
          alreadyAwarded: false,
        };

    // Update mastery evidence for the skill node.
    const assessment = await import("@/server/services/content").then(
      (m) => m.getAssessment(assessmentId, undefined),
    );
    const skillNodeId = assessment.skillNode?.id;
    if (skillNodeId) {
      await syncSkillProgress(user.id, skillNodeId);
    }

    // Advance quest objectives tied to this assessment.
    if (skillNodeId) {
      await recordQuestProgress(user.id, "", "assessment", skillNodeId).catch(() => {});
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        score,
        passed,
        feedback,
        attemptedAt: attempt.attemptedAt,
      },
      questionFeedback,
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
