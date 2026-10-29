import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { listDomains } from "@/server/services/content";
import { getRoadmapMastery } from "@/server/services/mastery";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const domains = await listDomains();

    // Attach mastery state per roadmap for the map visualization.
    const world = await Promise.all(
      domains.map(async (domain) => {
        const roadmapsWithMastery = await Promise.all(
          domain.roadmaps.map(async (r) => {
            const mastery = await getRoadmapMastery(user.id, r.id);
            const mastered = mastery.filter(
              (n) => n.state?.effectiveTier === "MASTERED",
            ).length;
            const total = mastery.length;
            return {
              id: r.id,
              slug: r.slug,
              title: r.title,
              role: r.role,
              difficulty: r.difficulty,
              order: r.order,
              progress:
                total > 0 ? Math.round((mastered / total) * 100) : 0,
              mastered,
              total,
            };
          }),
        );
        return {
          id: domain.id,
          slug: domain.slug,
          title: domain.title,
          description: domain.description,
          color: domain.color,
          order: domain.order,
          roadmaps: roadmapsWithMastery,
        };
      }),
    );

    return NextResponse.json({ world });
  });
}
