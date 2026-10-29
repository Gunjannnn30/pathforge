import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { recordStreak } from "@/server/services/streak";

const prisma = new PrismaClient();

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: "streak-test@example.com",
      username: "streaktest",
      name: "Streak Tester",
      passwordHash: "hash",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.userStreakRecord.deleteMany({ where: { userId } });
  await prisma.userGameProfile.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("streak system", () => {
  it("records a qualifying activity and advances the streak", async () => {
    const today = new Date();
    const result = await recordStreak(userId, {
      activityType: "LESSON",
      at: today,
      timezone: "UTC",
    });

    expect(result.currentStreak).toBe(1);
    expect(result.streakIncreased).toBe(true);

    // Same day again: idempotent, no increase.
    const sameDay = await recordStreak(userId, {
      activityType: "LESSON",
      at: today,
      timezone: "UTC",
    });
    expect(sameDay.streakIncreased).toBe(false);
    expect(sameDay.currentStreak).toBe(1);
  });

  it("builds a streak across consecutive days", async () => {
    const base = new Date(Date.UTC(2026, 9, 1, 12, 0, 0)); // Oct 1 2026
    await recordStreak(userId, { activityType: "LESSON", at: base, timezone: "UTC" });

    const day2 = new Date(Date.UTC(2026, 9, 2, 12, 0, 0));
    const r2 = await recordStreak(userId, { activityType: "LESSON", at: day2, timezone: "UTC" });
    expect(r2.currentStreak).toBe(2);

    const day3 = new Date(Date.UTC(2026, 9, 3, 12, 0, 0));
    const r3 = await recordStreak(userId, { activityType: "LESSON", at: day3, timezone: "UTC" });
    expect(r3.currentStreak).toBe(3);
    expect(r3.longestStreak).toBe(3);
  });
});
