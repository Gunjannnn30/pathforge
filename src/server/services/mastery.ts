
/**
 * Mastery evidence and skill-node progress.
 *
 * Mastery is never granted by clicking a checkbox. It is computed from
 * assessment evidence, practical work, and successful recall over time, using
 * the five-tier ladder:
 *   Discovered → Understood → Practiced → Demonstrated → Mastered
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";

export type MasteryTier =
  | "DISCOVERED"
  | "UNDERSTOOD"
  | "PRACTICED"
  | "DEMONSTRATED"
  | "MASTERED";

export const MASTERY_TIER_ORDER: Record<MasteryTier, number> = {
  DISCOVERED: 1,
  UNDERSTOOD: 2,
  PRACTICED: 3,
  DEMONSTRATED: 4,
  MASTERED: 5,
};

export interface RecordEvidenceInput {
  userId: string;
  conceptId: string; // skill node id
  evidenceType:
    | "LESSON_COMPLETION"
    | "COMPREHENSION_CHECK"
    | "TOPIC_ASSESSMENT"
    | "PRACTICE_EXERCISE"
    | "REVIEW_SESSION"
    | "PROJECT_MILESTONE"
    | "BOSS_ASSESSMENT"
    | "CHALLENGE_COMPLETION";
  evidenceReference?: string; // assessment/challenge/milestone id
  result: "PASS" | "FAIL" | "PARTIAL";
  tier: MasteryTier;
}

/** Record a piece of mastery evidence inside a transaction. */
export async function recordEvidence(input: RecordEvidenceInput) {
  return prisma.userMasteryEvidence.create({
    data: {
      userId: input.userId,
      conceptId: input.conceptId,
      evidenceType: input.evidenceType,
      evidenceReference: input.evidenceReference ?? null,
      result: input.result,
      tier: input.tier,
    },
  });
}

/**
 * Compute the effective mastery tier for a (user, skillNode) from all recorded
 * evidence. The effective tier is the highest tier for which there is a PASS
 * result at that tier or higher.
 */
export async function computeEffectiveTier(
  userId: string,
  conceptId: string,
): Promise<MasteryTier> {
  const evidence = await prisma.userMasteryEvidence.findMany({
    where: { userId, conceptId, result: "PASS" },
    select: { tier: true },
  });

  let best: MasteryTier = "DISCOVERED";
  for (const e of evidence) {
    if (MASTERY_TIER_ORDER[e.tier] > MASTERY_TIER_ORDER[best]) {
      best = e.tier;
    }
  }
  return best;
}

/**
 * Get full mastery state for a user's skill node: current stored status/tier,
 * effective tier, and the evidence list.
 */
export interface SkillMasteryState {
  skillNodeId: string;
  storedStatus: string;
  storedTier: MasteryTier;
  effectiveTier: MasteryTier;
  evidence: import("@prisma/client").UserMasteryEvidence[];
}

export async function getSkillMasteryState(
  userId: string,
  skillNodeId: string,
): Promise<SkillMasteryState | null> {
  const progress = await prisma.userSkillProgress.findUnique({
    where: { userId_skillNodeId: { userId, skillNodeId } },
  });
  const evidence = await prisma.userMasteryEvidence.findMany({
    where: { userId, conceptId: skillNodeId },
    orderBy: { recordedAt: "desc" },
  });
  if (!progress) return null;
  const effectiveTier = await computeEffectiveTier(userId, skillNodeId);
  return {
    skillNodeId,
    storedStatus: progress.status,
    storedTier: progress.tier,
    effectiveTier,
    evidence,
  };
}

/**
 * Recompute and persist a skill node's progress row from its evidence. Returns
 * the updated row.
 */
export async function syncSkillProgress(userId: string, skillNodeId: string) {
  const effectiveTier = await computeEffectiveTier(userId, skillNodeId);

  // Map effective tier to a display status.
  const statusMap: Record<MasteryTier, string> = {
    DISCOVERED: "discovered",
    UNDERSTOOD: "understood",
    PRACTICED: "practiced",
    DEMONSTRATED: "demonstrated",
    MASTERED: "mastered",
  };

  return prisma.userSkillProgress.upsert({
    where: { userId_skillNodeId: { userId, skillNodeId } },
    create: {
      userId,
      skillNodeId,
      status: statusMap[effectiveTier],
      tier: effectiveTier,
      xpEarned: 0,
      completedAt:
        effectiveTier === "MASTERED" ? new Date() : undefined,
    },
    update: {
      status: statusMap[effectiveTier],
      tier: effectiveTier,
      ...(effectiveTier === "MASTERED"
        ? { completedAt: new Date() }
        : {}),
    },
  });
}

/** Get all mastery states for a user across a roadmap's skill nodes. */
export async function getRoadmapMastery(
  userId: string,
  roadmapId: string,
) {
  const nodes = await prisma.skillNode.findMany({
    where: { roadmapId, isPublished: true },
    select: { id: true, title: true, difficulty: true, order: true },
    orderBy: { order: "asc" },
  });

  const states = await Promise.all(
    nodes.map((n) => getSkillMasteryState(userId, n.id)),
  );

  return nodes.map((n, i) => ({
    ...n,
    state: states[i],
  }));
}

/** Distribution of mastery tiers across all of a user's progressed nodes. */
export async function getMasteryDistribution(userId: string) {
  const progresses = await prisma.userSkillProgress.findMany({
    where: { userId },
    select: { tier: true, status: true },
  });

  const distribution: Record<string, number> = {};
  for (const p of progresses) {
    distribution[p.tier] = (distribution[p.tier] ?? 0) + 1;
  }
  const mastered = progresses.filter((p) => p.tier === "MASTERED").length;
  const total = progresses.length;
  return {
    total,
    mastered,
    distribution,
    masteryPct: total > 0 ? Math.round((mastered / total) * 100) : 0,
  };
}

