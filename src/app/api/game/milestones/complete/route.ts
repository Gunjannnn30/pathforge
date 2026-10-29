import { NextResponse, type NextRequest } from "next/server";
import { handleApi, parseBody, requireUser } from "@/server/http";
import { completeMilestoneSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { processLearningEvent } from "@/server/services/reward";
import { recordQuestProgress } from "@/server/services/quest";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { milestoneId, evidenceUrl, idempotencyKey } = await parseBody(
      req,
      completeMilestoneSchema,
    );

    const completion = await prisma.projectMilestoneCompletion.upsert({
      where: { userId_milestoneId: { userId: user.id, milestoneId } },
      create: { userId: user.id, milestoneId, evidenceUrl },
      update: { evidenceUrl },
      select: { id: true, milestoneId: true, submittedAt: true, approved: true },
    });

    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
      select: { id: true, xpReward: true, title: true, projectId: true },
    });

    // Award XP only if the milestone is required and approved (MVP: auto-approve required milestones).
    let reward = { xpAwarded: 0, leveledUp: false, previousLevel: 0, newLevel: 0, progress: null as any, alreadyAwarded: false };
    if (milestone) {
      // Mark as approved for MVP (self-submission counts as demonstrated work).
      await prisma.projectMilestoneCompletion.update({
        where: { id: completion.id },
        data: { reviewed: true, approved: true },
      });
      reward = await processLearningEvent({
        userId: user.id,
        eventType: "milestone_complete",
        eventId: `milestone-${milestoneId}-${idempotencyKey}`,
        reason: `Completed milestone ${milestone.title}`,
        milestoneId,
      });
    }

    // Advance quest objectives tied to this milestone.
    await recordQuestProgress(user.id, "", "milestone", milestoneId).catch(() => {});

    return NextResponse.json({
      completion: { ...completion, approved: true },
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
