import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { enrollInRoadmap } from "@/server/services/content";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { id } = await params;
    const enrollment = await enrollInRoadmap(user.id, id);
    return NextResponse.json({ enrollment });
  });
}
