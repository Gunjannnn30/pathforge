import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const [definitions, earned] = await Promise.all([
      prisma.achievementDefinition.findMany({
        where: { isPublished: true },
        orderBy: { category: "asc", title: "asc" },
      }),
      prisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
        orderBy: { unlockedAt: "desc" },
      }),
    ]);

    const earnedSlugs = new Set(earned.map((e) => e.achievementId));
    return NextResponse.json({
      definitions: definitions.map((d) => ({
        ...d,
        earned: earnedSlugs.has(d.id),
      })),
      earned: earned.map((e) => ({
        id: e.achievement.id,
        slug: e.achievement.slug,
        title: e.achievement.title,
        description: e.achievement.description,
        category: e.achievement.category,
        badgeIcon: e.achievement.badgeIcon,
        unlockedAt: e.unlockedAt,
        evidenceReference: e.evidenceReference,
      })),
    });
  });
}
