
/**
 * Quest system: converts learning goals into actionable missions.
 *
 * Quest types: daily, weekly, roadmap, personalized. Objectives are stored as
 * structured JSON so progress can be validated server-side against real
 * learning events.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";
import { processLearningEvent } from "./reward";

export type QuestType = "DAILY" | "WEEKLY" | "ROADMAP" | "PERSONALIZED";
export type QuestStatus = "ACTIVE" | "COMPLETED" | "DISMISSED" | "EXPIRED";

export interface QuestObjective {
  kind: "lesson" | "assessment" | "challenge" | "milestone" | "review" | "roadmap";
  target: string; // concept/skill-node id or roadmap id
  count: number;
  conceptId?: string;
}

export interface QuestWithProgress {
  id: string;
  slug: string;
  title: string;
  description: string;
  questType: QuestType;
  rewardXp: number;
  status: QuestStatus;
  progress: QuestObjectiveProgress[];
  startedAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
  reason?: string; // why this quest was recommended (personalized)
}

/** Progress toward a single objective. */
export interface QuestObjectiveProgress {
  kind: string;
  target: string;
  count: number;
  current: number;
  completed: boolean;
}

/**
 * List active quests for a user, with computed progress. Optional roadmapId
 * filters to roadmap-specific quests.
 */
export async function listUserQuests(
  userId: string,
  opts: { roadmapId?: string; includeDismissed?: boolean } = {},
): Promise<QuestWithProgress[]> {
  const { roadmapId, includeDismissed = false } = opts;

  const userQuests = await prisma.userQuest.findMany({
    where: {
      userId,
      status: includeDismissed
        ? undefined
        : { in: ["ACTIVE", "COMPLETED"] as QuestStatus[] },
      ...(roadmapId ? { quest: { roadmapId } } : {}),
    },
    include: { quest: true },
    orderBy: [{ startedAt: "desc" }],
  });

  return Promise.all(
    userQuests.map((uq) => buildQuestWithProgress(uq)),
  );
}

async function buildQuestWithProgress(
  uq: import("@prisma/client").UserQuest & {
    quest: import("@prisma/client").QuestDefinition;
  },
): Promise<QuestWithProgress> {
  const objectives = (uq.quest.objectives as unknown as QuestObjective[]) ?? [];
  const progressData = (uq.progressData as Record<string, number>) ?? {};

  const objectiveProgress = objectives.map((obj) => {
    const key = `${obj.kind}:${obj.target}`;
    const current = progressData[key] ?? 0;
    return {
      kind: obj.kind,
      target: obj.target,
      count: obj.count,
      current: Math.min(current, obj.count),
      completed: current >= obj.count,
    };
  });

  const completed = objectiveProgress.every((o) => o.completed);

  return {
    id: uq.id,
    slug: uq.quest.slug,
    title: uq.quest.title,
    description: uq.quest.description,
    questType: uq.quest.questType as QuestType,
    rewardXp: uq.quest.rewardXp,
    status: uq.status as QuestStatus,
    progress: objectiveProgress,
    startedAt: uq.startedAt,
    completedAt: uq.completedAt,
    expiresAt: uq.expiresAt,
    reason: uq.quest.description,
  };
}

/**
 * Activate (or return existing) roadmap quests for a user who has enrolled in
 * a roadmap. Creates introductory/core/practice/revision/capstone quests from
 * the roadmap's quest definitions.
 */
export async function activateRoadmapQuests(
  userId: string,
  roadmapId: string,
) {
  const quests = await prisma.questDefinition.findMany({
    where: { roadmapId, isActive: true },
  });

  const activated: import("@prisma/client").UserQuest[] = [];
  for (const q of quests) {
    const existing = await prisma.userQuest.findFirst({
      where: { userId, questId: q.id },
    });
    if (existing) {
      activated.push(existing);
      continue;
    }
    const created = await prisma.userQuest.create({
      data: {
        userId,
        questId: q.id,
        status: "ACTIVE",
        progressData: {},
        startedAt: new Date(),
        expiresAt: q.expiresAt,
      },
    });
    activated.push(created);
  }
  return activated;
}

/**
 * Record progress toward a quest objective. Validated server-side: only counts
 * real completed learning events. Returns the updated quest if it became
 * complete (so the caller can award XP).
 */
export async function recordQuestProgress(
  userId: string,
  questId: string,
  objectiveKind: string,
  targetId: string,
) {
  const userQuest = await prisma.userQuest.findUnique({
    where: { id: questId },
    include: { quest: true },
  });
  if (!userQuest || userQuest.userId !== userId) {
    throw notFound("Quest not found.");
  }
  if (userQuest.status !== "ACTIVE") return userQuest;

  const objectives = (userQuest.quest.objectives as unknown as QuestObjective[]) ?? [];
  const matching = objectives.find(
    (o) => o.kind === objectiveKind && o.target === targetId,
  );
  if (!matching) return userQuest; // objective not part of this quest

  const key = `${objectiveKind}:${targetId}`;
  const progressData = (userQuest.progressData as Record<string, number>) ?? {};
  const current = progressData[key] ?? 0;
  if (current >= matching.count) return userQuest; // already complete

  progressData[key] = current + 1;

  const updated = await prisma.userQuest.update({
    where: { id: questId },
    data: { progressData },
    include: { quest: true },
  });

  const allComplete = objectives.every((o) => {
    const k = `${o.kind}:${o.target}`;
    return (progressData[k] ?? 0) >= o.count;
  });

  if (allComplete && updated.status !== "COMPLETED") {
    const completed = await prisma.userQuest.update({
      where: { id: questId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    // Award quest XP exactly once.
    await processLearningEvent({
      userId,
      eventType: "quest_complete",
      eventId: `quest-${questId}-${userId}`,
      reason: `Completed quest: ${userQuest.quest.title}`,
      questId: completed.id,
    });
    return completed;
  }
  return updated;
}

export async function dismissUserQuest(
  userId: string,
  questId: string,
) {
  return prisma.userQuest.update({
    where: { id: questId },
    data: { status: "DISMISSED" },
    select: { id: true, status: true },
  });
}

/**
 * Generate a personalized quest recommendation based on the user's actual
 * progress. Returns null if there is nothing useful to recommend.
 */
export async function recommendPersonalizedQuest(userId: string) {
  // Find skill nodes in progress that have evidence but aren't mastered.
  const inProgress = await prisma.userSkillProgress.findMany({
    where: { userId, status: { in: ["in_progress", "practiced", "review_due"] } },
    include: { skillNode: { select: { id: true, title: true, roadmapId: true } } },
    take: 5,
  });

  for (const p of inProgress) {
    const node = p.skillNode!;
    const hasReviewDue = p.status === "review_due";
    if (hasReviewDue) {
      return {
        slug: `review-${node.id}`,
        title: `Review: ${node.title}`,
        description: `Your understanding of "${node.title}" is due for review. Revisit it to keep the knowledge fresh.`,
        questType: "PERSONALIZED" as const,
        rewardXp: 10,
        objectives: [{ kind: "review", target: node.id, count: 1 }],
        reason: `Review due for ${node.title}`,
      };
    }
  }

  return null;
}

