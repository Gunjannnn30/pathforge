import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { getRoadmapMastery, getMasteryDistribution } from "@/server/services/mastery";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const roadmapId = req.nextUrl.searchParams.get("roadmapId");
    const distribution = await getMasteryDistribution(user.id);
    const roadmap = roadmapId
      ? await getRoadmapMastery(user.id, roadmapId)
      : null;
    return NextResponse.json({ distribution, roadmap });
  });
}
