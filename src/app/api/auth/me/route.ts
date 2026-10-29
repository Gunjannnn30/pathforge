import { NextResponse, type NextRequest } from "next/server";
import { handleApi, requireUser } from "@/server/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
        timezone: user.timezone,
      },
    });
  });
}
