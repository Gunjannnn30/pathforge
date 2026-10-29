import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";
import { getStreak } from "@/server/services/streak";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const streak = await getStreak(user.id);
    return NextResponse.json({ streak });
  });
}
