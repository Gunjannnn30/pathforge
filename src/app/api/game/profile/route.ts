import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { xpProgress, rankForLevel } from "@/server/services/reward";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);

    const profile = await prisma.userGameProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, level: 1, totalXP: 0 },
      update: {},
    });

    const progress = xpProgress(profile.totalXP);
    const [streak, recent] = await Promise.all([
      prisma.userGameProfile.findUnique({
        where: { userId: user.id },
        select: { currentStreak: true, longestStreak: true, hideStreakDisplay: true },
      }),
      prisma.xPTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      profile: {
        id: profile.id,
        level: profile.level,
        totalXP: profile.totalXP,
        rank: rankForLevel(profile.level),
        progress,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        hideStreakDisplay: streak?.hideStreakDisplay ?? false,
      },
      recentXp: recent.map((t) => ({
        id: t.id,
        eventType: t.eventType,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.createdAt,
      })),
    });
  });
}
