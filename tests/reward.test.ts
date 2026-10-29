import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { processLearningEvent, xpProgress, levelForXP, xpForLevel, rankForLevel } from "@/server/services/reward";

const prisma = new PrismaClient();

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: "reward-test@example.com",
      username: "rewardtest",
      name: "Reward Tester",
      passwordHash: "hash",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.xPTransaction.deleteMany({ where: { userId } });
  await prisma.userGameProfile.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("reward engine", () => {
  it("awards XP exactly once for the same idempotency key", async () => {
    const eventId = "reward-test-review-1";

    const first = await processLearningEvent({
      userId,
      eventType: "review_session",
      eventId,
      reason: "Reviewed a concept",
    });

    expect(first.alreadyAwarded).toBe(false);
    expect(first.xpAwarded).toBe(10);
    expect(first.profile?.totalXP).toBe(10);

    const replay = await processLearningEvent({
      userId,
      eventType: "review_session",
      eventId,
      reason: "Reviewed a concept",
    });

    expect(replay.alreadyAwarded).toBe(true);
    expect(replay.xpAwarded).toBe(10);
    expect(replay.profile?.totalXP).toBe(10);
  });

  it("does not award XP when the learning event is not eligible", async () => {
    const eventId = "reward-test-ineligible";

    const result = await processLearningEvent({
      userId,
      eventType: "lesson_complete",
      eventId,
      reason: "No completion",
      topicId: "nonexistent-topic",
      amount: 10,
    });

    expect(result.xpAwarded).toBe(0);
    expect(result.alreadyAwarded).toBe(false);
  });

  it("awards lesson XP when a real lesson is completed", async () => {
    const domain = await prisma.learningDomain.create({
      data: { slug: "lt-domain", title: "LT Domain", order: 1 },
    });
    const roadmap = await prisma.roadmap.create({
      data: { slug: "lt-roadmap", title: "LT Roadmap", domainId: domain.id, order: 1 },
    });
    const node = await prisma.skillNode.create({
      data: { slug: "lt-node", title: "LT Node", roadmapId: roadmap.id, order: 1 },
    });
    const lesson = await prisma.lesson.create({
      data: {
        slug: "lt-lesson",
        skillNodeId: node.id,
        title: "LT Lesson",
        body: "x",
        comprehensionCheck: true,
        xpReward: 10,
        order: 1,
        isPublished: true,
      },
    });

    const completion = await prisma.lessonCompletion.create({
      data: { userId, lessonId: lesson.id },
    });

    const result = await processLearningEvent({
      userId,
      eventType: "lesson_complete",
      eventId: "reward-test-lesson-real",
      reason: "Completed lesson",
      topicId: node.id,
    });

    expect(result.xpAwarded).toBe(10);

    await prisma.lessonCompletion.delete({ where: { id: completion.id } });
    await prisma.lesson.delete({ where: { id: lesson.id } });
    await prisma.skillNode.delete({ where: { id: node.id } });
    await prisma.roadmap.delete({ where: { id: roadmap.id } });
    await prisma.learningDomain.delete({ where: { id: domain.id } });
  });

  it("computes level and rank correctly", () => {
    expect(levelForXP(0)).toBe(1);
    expect(levelForXP(60)).toBe(2);
    expect(xpForLevel(2)).toBe(60);
    expect(rankForLevel(1)).toBe("Initiate");
    expect(rankForLevel(50)).toBe("Expert");
  });

  it("computes progress to next level", () => {
    const progress = xpProgress(70);
    expect(progress.level).toBe(2);
    expect(progress.totalXP).toBe(70);
    expect(progress.progressPct).toBeGreaterThan(0);
  });
});
