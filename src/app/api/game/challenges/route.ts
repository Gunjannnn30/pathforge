import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { listChallenges } from "@/server/services/content";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const roadmapId = req.nextUrl.searchParams.get("roadmapId");
    if (!roadmapId) {
      return NextResponse.json({ challenges: [] });
    }
    const challenges = await listChallenges(roadmapId);
    return NextResponse.json({ challenges });
  });
}
