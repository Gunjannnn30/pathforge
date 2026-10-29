/**
 * Pathforge reward engine.
 *
 * Core principle: reward demonstrated learning, not merely activity. Every XP
 * award is generated server-side from a validated educational event, is
 * idempotent (exactly once per eventId), and can never be inflated by the
 * client.
 *
 * See docs/REWARDS.md for the full XP economy, progression rules, and
 * anti-exploitation policy.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordStreak } from "./streak";

// ---------------------------------------------------------------------------
// XP policy (configurable by administrators). Illustrative initial values.
// ---------------------------------------------------------------------------

export const XP_POLICY: Record<string, number> = {
  lesson_complete: 10,
  assessment_pass: 15,
  challenge_pass: 20,
  boss_pass: 50,
  milestone_complete: 30,
  quest_complete: 10,
  review_session: 10,
  roadmap_complete: 200,
} as const;

export type EventType = keyof typeof XP_POLICY | "custom";

export const LEVEL_RANKS: Record<number, string> = {
  1: "Initiate",
  5: "Explorer",
  10: "Apprentice",
  20: "Practitioner",
  35: "Specialist",
  50: "Expert",
  75: "Master",
  100: "Grandmaster",
};

function policy(eventType: string): number {
  return Number(XP_POLICY[eventType as keyof typeof XP_POLICY] ?? 0);
}

/** Cumulative XP required to reach `level` (level 1 starts at 0). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(60 * Math.pow(level - 1, 1.4));
}

/** Highest level reachable with `totalXP`. */
export function levelForXP(totalXP: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXP) level += 1;
  return level;
}

export function xpProgress(totalXP: number) {
  const level = levelForXP(totalXP);
  const xpForCurrent = xpForLevel(level);
  const xpForNext = xpForLevel(level + 1);
  const progress = totalXP - xpForCurrent;
  const needed = xpForNext - xpForCurrent;
  return {
    level,
    totalXP,
    xpForCurrent,
    xpForNext,
    progress,
    needed,
    progressPct: needed > 0 ? Math.min(100, Math.round((progress / needed) * 100)) : 100,
  };
}

export function rankForLevel(level: number): string {
  let rank = String(LEVEL_RANKS[1] ?? "Initiate");
  for (const [threshold, label] of Object.entries(LEVEL_RANKS)) {
    if (level >= Number(threshold)) rank = String(label);
  }
  return rank;
}

// ---------------------------------------------------------------------------
// Event input
// ---------------------------------------------------------------------------

export interface RewardEventInput {
  userId: string;
  eventType: string;
  eventId: string; // client-generated idempotency key
  reason: string;
  amount?: number; // server-validated override; defaults to policy/content value
  topicId?: string; // skill node id
  assessmentId?: string;
  challengeId?: string;
  milestoneId?: string;
  questId?: string;
}

export interface RewardResult {
  transaction: Prisma.XPTransactionGetPayload<{}>;
  profile: Prisma.UserGameProfileGetPayload<{}> | null;
  progress: ReturnType<typeof xpProgress>;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
  alreadyAwarded: boolean;
  xpAwarded: number;
}

// ---------------------------------------------------------------------------
// Eligibility validation + amount resolution (server-side only).
// ---------------------------------------------------------------------------

async function resolveAmountAndValidate(
  tx: Prisma.TransactionClient,
  input: RewardEventInput,
): Promise<{ amount: number; eligible: boolean; skipReason?: string }> {
  const {
    eventType,
    topicId,
    assessmentId,
    challengeId,
    milestoneId,
    questId,
    userId,
  } = input;

  // Amount: prefer explicit server-set override, then configured content value,
  // then policy default. The client can never inflate this.
  let amount = input.amount ?? policy(eventType);

  switch (eventType) {
    case "lesson_complete": {
      if (!topicId) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "lesson_complete requires a topic/skill node.",
        };
      }
      const lesson = await tx.lesson.findFirst({
        where: { skillNodeId: topicId, isPublished: true },
        select: { id: true, xpReward: true },
        orderBy: { order: "asc" },
      });
      if (!lesson) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "No published lesson found for this topic.",
        };
      }
      const completion = await tx.lessonCompletion.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
      });
      if (!completion) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "Lesson has not been completed by this user.",
        };
      }
      amount = Number(lesson.xpReward ?? policy(eventType));
      return { amount, eligible: true };
    }
    case "assessment_pass": {
      if (!assessmentId) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "assessment_pass requires an assessment.",
        };
      }
      const attempt = await tx.assessmentAttempt.findFirst({
        where: { userId, assessmentId, passed: true },
        select: { id: true },
        orderBy: { completedAt: "desc" },
      });
      if (!attempt) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "No passing assessment attempt found.",
        };
      }
      // Prevent farming: award once per assessment.
      const already = await tx.xPTransaction.findFirst({
        where: { userId, eventType: "assessment_pass", assessmentId },
      });
      if (already) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "XP already awarded for this assessment.",
        };
      }
      const assessment = await tx.assessment.findUnique({
        where: { id: assessmentId },
        select: { xpReward: true, isBoss: true },
      });
      if (!assessment) {
        return { amount: 0, eligible: false, skipReason: "Assessment not found." };
      }
      amount = assessment.isBoss
        ? policy("boss_pass")
        : Number(assessment.xpReward ?? policy("assessment_pass"));
      return { amount, eligible: true };
    }
    case "challenge_pass": {
      if (!challengeId) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "challenge_pass requires a challenge.",
        };
      }
      const attempt = await tx.challengeAttempt.findFirst({
        where: { userId, challengeId, result: "PASS" },
        select: { id: true },
        orderBy: { completedAt: "desc" },
      });
      if (!attempt) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "No passing challenge attempt found.",
        };
      }
      const already = await tx.xPTransaction.findFirst({
        where: { userId, eventType: "challenge_pass", challengeId },
      });
      if (already) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "XP already awarded for this challenge.",
        };
      }
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        select: { xpReward: true, isBoss: true },
      });
      if (!challenge) {
        return { amount: 0, eligible: false, skipReason: "Challenge not found." };
      }
      amount = challenge.isBoss
        ? policy("boss_pass")
        : Number(challenge.xpReward ?? policy("challenge_pass"));
      return { amount, eligible: true };
    }
    case "milestone_complete": {
      if (!milestoneId) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "milestone_complete requires a milestone.",
        };
      }
      const completion = await tx.projectMilestoneCompletion.findUnique({
        where: { userId_milestoneId: { userId, milestoneId } },
        select: { id: true, approved: true },
      });
      if (!completion || !completion.approved) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "Milestone not completed/approved for this user.",
        };
      }
      const milestone = await tx.projectMilestone.findUnique({
        where: { id: milestoneId },
        select: { xpReward: true },
      });
      amount = Number(milestone?.xpReward ?? policy("milestone_complete"));
      return { amount, eligible: true };
    }
    case "quest_complete": {
      if (!questId) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "quest_complete requires a quest.",
        };
      }
      const userQuest = await tx.userQuest.findUnique({
        where: { id: questId },
        select: { id: true, status: true, userId: true },
      });
      if (
        !userQuest ||
        userQuest.userId !== userId ||
        userQuest.status !== "COMPLETED"
      ) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "Quest is not completed by this user.",
        };
      }
      const quest = await tx.questDefinition.findUnique({
        where: { id: questId },
        select: { rewardXp: true },
      });
      amount = Number(quest?.rewardXp ?? policy("quest_complete"));
      return { amount, eligible: true };
    }
    case "review_session": {
      amount = policy("review_session");
      return { amount, eligible: true };
    }
    case "roadmap_complete": {
      if (!topicId) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "roadmap_complete requires a roadmap id.",
        };
      }
      // topicId carries the roadmap id for this event type.
      const enrollment = await tx.roadmapEnrollment.findUnique({
        where: { userId_roadmapId: { userId, roadmapId: topicId } },
        select: { id: true, completedAt: true },
      });
      if (!enrollment?.completedAt) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "Roadmap not completed by this user.",
        };
      }
      const already = await tx.xPTransaction.findFirst({
        where: { userId, eventType: "roadmap_complete", topicId },
      });
      if (already) {
        return {
          amount: 0,
          eligible: false,
          skipReason: "XP already awarded for this roadmap.",
        };
      }
      const roadmap = await tx.roadmap.findUnique({
        where: { id: topicId },
        select: { xpMilestoneReward: true },
      });
      amount = Number(roadmap?.xpMilestoneReward ?? policy("roadmap_complete"));
      return { amount, eligible: true };
    }
    default:
      return { amount, eligible: true };
  }
}

// ---------------------------------------------------------------------------
// Core: award XP exactly once inside a transaction.
// ---------------------------------------------------------------------------

export async function awardXP(input: RewardEventInput): Promise<RewardResult> {
  const existing = await prisma.xPTransaction.findUnique({
    where: { eventId: input.eventId },
    select: { id: true, userId: true, amount: true, createdAt: true },
  });
  if (existing) {
    // Idempotent replay: return the original award without duplicating.
    const profile = await prisma.userGameProfile.findUnique({
      where: { userId: existing.userId },
    });
    const progress = profile ? xpProgress(profile.totalXP) : xpProgress(0);
    return {
      transaction: existing as Prisma.XPTransactionGetPayload<{}>,
      profile: (profile ?? null) as
        | Prisma.UserGameProfileGetPayload<{}>
        | null,
      progress,
      leveledUp: false,
      previousLevel: 0,
      newLevel: 0,
      alreadyAwarded: true,
      xpAwarded: existing.amount,
    };
  }

  return prisma.$transaction(async (tx) => {
    const { amount, eligible } = await resolveAmountAndValidate(tx, input);
    if (!eligible || amount <= 0) {
      // Still record a zero-amount transaction so the attempt is auditable and
      // cannot be retried to farm a different outcome.
      const transaction = await tx.xPTransaction.create({
        data: {
          userId: input.userId,
          eventId: input.eventId,
          eventType: input.eventType,
          amount: 0,
          reason: input.reason + (eligible ? "" : " [not eligible]"),
          topicId: input.topicId,
          assessmentId: input.assessmentId,
          challengeId: input.challengeId,
        },
      });
      const profile = await tx.userGameProfile.findUnique({
        where: { userId: input.userId },
      });
      const progress = profile ? xpProgress(profile.totalXP) : xpProgress(0);
      return {
        transaction,
        profile: (profile ?? null) as
          | Prisma.UserGameProfileGetPayload<{}>
          | null,
        progress,
        leveledUp: false,
        previousLevel: 0,
        newLevel: 0,
        alreadyAwarded: false,
        xpAwarded: 0,
      };
    }

    // Upsert the game profile and add XP.
    const profile = await tx.userGameProfile.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        level: 1,
        totalXP: amount,
      },
      update: {
        totalXP: {
          increment: amount,
        },
      },
    });

    // profile.totalXP already includes the increment; profile.level is the
    // previous level. Compute the new level from the updated total.
    const previousLevel = profile.level;
    const newLevel = levelForXP(profile.totalXP);
    const leveledUp = newLevel > previousLevel;

    const updatedProfile = await tx.userGameProfile.update({
      where: { userId: input.userId },
      data: {
        level: newLevel,
      },
    });

    const transaction = await tx.xPTransaction.create({
      data: {
        userId: input.userId,
        eventId: input.eventId,
        eventType: input.eventType,
        amount,
        reason: input.reason,
        topicId: input.topicId,
        assessmentId: input.assessmentId,
        challengeId: input.challengeId,
      },
    });

    const progress = xpProgress(updatedProfile.totalXP);

    return {
      transaction,
      profile: updatedProfile,
      progress,
      leveledUp,
      previousLevel,
      newLevel,
      alreadyAwarded: false,
      xpAwarded: amount,
    };
  });
}

/**
 * Top-level entry point for a validated learning event. Awards XP (exactly
 * once), advances the streak for qualifying activities, and returns a reward
 * summary the UI can render. Mastery evidence, quest progress, and
 * achievements are handled by their own modules and may be called afterwards.
 */
export async function processLearningEvent(
  input: RewardEventInput,
): Promise<RewardResult & { streakUpdated: boolean }> {
  const result = await awardXP(input);

  // Only qualifying learning activities advance the streak.
  const qualifying: string[] = [
    "lesson_complete",
    "assessment_pass",
    "challenge_pass",
    "milestone_complete",
    "review_session",
  ];
  let streakUpdated = false;
  if (result.xpAwarded > 0 && qualifying.includes(input.eventType)) {
    const streak = await recordStreak(input.userId);
    streakUpdated = streak.streakIncreased;
  }

  return { ...result, streakUpdated };
}

