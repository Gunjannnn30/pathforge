import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { getSkillNode } from "@/server/services/content";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    const node = await getSkillNode(id, user.id);
    return NextResponse.json({ node });
  });
}
