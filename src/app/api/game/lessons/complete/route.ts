import { NextResponse, type NextRequest } from "next/server";
import { handleApi, parseBody, requireUser } from "@/server/http";
import { completeLessonSchema } from "@/lib/schemas";
import { completeLesson } from "@/server/services/content";
import { processLearningEvent } from "@/server/services/reward";
import { syncSkillProgress } from "@/server/services/mastery";
import { recordQuestProgress } from "@/server/services/quest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { lessonId, idempotencyKey } = await parseBody(req, completeLessonSchema);

    const { completion, skillNodeId } = await completeLesson(user.id, lessonId);

    // Award XP exactly once for the lesson completion.
    const reward = await processLearningEvent({
      userId: user.id,
      eventType: "lesson_complete",
      eventId: `lesson-${lessonId}-${idempotencyKey}`,
      reason: `Completed lesson ${lessonId}`,
      topicId: skillNodeId,
    });

    // Update skill-node progress to discovered/in_progress.
    await syncSkillProgress(user.id, skillNodeId);

    // Advance any quest objectives tied to this lesson.
    await recordQuestProgress(user.id, "", "lesson", skillNodeId).catch(() => {});

    return NextResponse.json({
      completion,
      reward: {
        xpAwarded: reward.xpAwarded,
        leveledUp: reward.leveledUp,
        previousLevel: reward.previousLevel,
        newLevel: reward.newLevel,
        progress: reward.progress,
        alreadyAwarded: reward.alreadyAwarded,
      },
    });
  });
}
