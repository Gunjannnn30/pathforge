import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { listUserQuests, activateRoadmapQuests, recommendPersonalizedQuest } from "@/server/services/quest";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const roadmapId = req.nextUrl.searchParams.get("roadmapId");
    if (roadmapId) {
      await activateRoadmapQuests(user.id, roadmapId);
    }
    const quests = await listUserQuests(user.id, { roadmapId: roadmapId || undefined });

    // Also surface one personalized recommendation if appropriate.
    const recommendation = await recommendPersonalizedQuest(user.id).catch(() => null);

    return NextResponse.json({ quests, recommendation });
  });
}
