
/**
 * Learning streak system.
 *
 * A streak represents a qualifying learning day, not merely opening the app.
 * It respects the learner's configured timezone, does not count background
 * activity or repeated clicks, and never removes earned XP when a streak ends.
 */

import { prisma } from "@/lib/prisma";
import { subDays, format } from "date-fns";

export type QualifyingActivity = "LESSON" | "ASSESSMENT" | "PRACTICE" | "REVIEW" | "PROJECT";

/** Compute the calendar date (yyyy-MM-dd) of a UTC instant in an IANA timezone. */
function localDateString(at: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (name: string) => parts.find((p) => p.type === name)?.value ?? "0";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Record a qualifying activity for the current local day. Returns the current
 * streak state. Idempotent per (user, localDate).
 */
export async function recordStreak(
  userId: string,
  opts: {
    activityType: QualifyingActivity;
    at?: Date;
    timezone?: string;
  } = { activityType: "LESSON" },
): Promise<{
  streakIncreased: boolean;
  currentStreak: number;
  longestStreak: number;
  localDate: string;
}> {
  const { activityType, at = new Date(), timezone } = opts;

  const profile = await prisma.userGameProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      currentStreak: true,
      longestStreak: true,
      timezone: true,
    },
  });
  const tz = timezone ?? profile?.timezone ?? "UTC";

  const localDate = localDateString(at, tz);

  // Idempotency: already recorded for this local day.
  const existing = await prisma.userStreakRecord.findUnique({
    where: { userId_localDate: { userId, localDate } },
    select: { id: true },
  });
  if (existing) {
    const current = await prisma.userGameProfile.findUnique({
      where: { userId },
      select: { currentStreak: true, longestStreak: true },
    });
    return {
      streakIncreased: false,
      currentStreak: current?.currentStreak ?? 0,
      longestStreak: current?.longestStreak ?? 0,
      localDate,
    };
  }

  await prisma.userStreakRecord.create({
    data: {
      userId,
      localDate,
      qualifyingActivityType: activityType,
      timezone: tz,
    },
  });

  // Recompute streak from all records for this user.
  const records = await prisma.userStreakRecord.findMany({
    where: { userId },
    select: { localDate: true },
  });

  const dateSet = new Set(records.map((r) => r.localDate));

  // Count consecutive calendar days ending at today (inclusive).
  const today = new Date(localDate); // parsed as UTC midnight; fine for day math
  let streak = 0;
  for (let i = 0; ; i += 1) {
    const expected = format(subDays(today, i), "yyyy-MM-dd");
    if (dateSet.has(expected)) {
      streak = i + 1;
    } else {
      break;
    }
  }

  const longest = Math.max(streak, profile?.longestStreak ?? 0);

  const updated = await prisma.userGameProfile.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: streak,
      longestStreak: longest,
      lastQualifyingActivityAt: at,
    },
    update: {
      currentStreak: streak,
      longestStreak: longest,
      lastQualifyingActivityAt: at,
    },
  });

  return {
    streakIncreased: streak > (profile?.currentStreak ?? 0),
    currentStreak: updated.currentStreak,
    longestStreak: updated.longestStreak,
    localDate,
  };
}

export async function getStreak(userId: string) {
  return prisma.userGameProfile.findUnique({
    where: { userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastQualifyingActivityAt: true,
      timezone: true,
      hideStreakDisplay: true,
    },
  });
}

