import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { getAssessment } from "@/server/services/content";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    const assessment = await getAssessment(id, user.id);
    return NextResponse.json({ assessment });
  });
}
