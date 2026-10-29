import { NextResponse, type NextRequest } from "next/server";
import { handleApi } from "@/server/http";
import { endRequestSession } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    await endRequestSession(req);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("pathforge_session", "", { maxAge: 0, path: "/" });
    return response;
  });
}
