import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { getLesson } from "@/server/services/content";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    const lesson = await getLesson(id, user.id);
    return NextResponse.json({ lesson });
  });
}
