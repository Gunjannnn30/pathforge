import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { listRoadmaps } from "@/server/services/content";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const roadmaps = await listRoadmaps(user.id);
    return NextResponse.json({ roadmaps });
  });
}
