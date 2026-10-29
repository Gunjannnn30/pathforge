import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { xpProgress, rankForLevel, levelForXP } from "@/server/services/reward";
import { getMasteryDistribution } from "@/server/services/mastery";
import { listUserQuests } from "@/server/services/quest";
import { listRoadmaps } from "@/server/services/content";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);

    const [profile, roadmaps, mastery, quests] = await Promise.all([
      prisma.userGameProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, level: 1, totalXP: 0 },
        update: {},
      }),
      listRoadmaps(user.id),
      getMasteryDistribution(user.id),
      listUserQuests(user.id),
    ]);

    const progress = xpProgress(profile.totalXP);
    const activeRoadmap = roadmaps.find((r) => r.enrolled && !r.completedAt);
    const activeQuests = quests.filter((q) => q.status === "ACTIVE").slice(0, 5);
    const recentAchievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      profile: {
        level: profile.level,
        totalXP: profile.totalXP,
        rank: rankForLevel(profile.level),
        progress,
      },
      activeRoadmap,
      activeQuests,
      mastery,
      recentAchievements: recentAchievements.map((a) => ({
        id: a.achievement.id,
        slug: a.achievement.slug,
        title: a.achievement.title,
        category: a.achievement.category,
        badgeIcon: a.achievement.badgeIcon,
        unlockedAt: a.unlockedAt,
      })),
    });
  });
}
