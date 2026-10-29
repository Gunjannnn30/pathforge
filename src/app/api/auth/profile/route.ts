import { NextResponse, type NextRequest } from "next/server";
import { handleApi, parseBody, requireUser } from "@/server/http";
import { updateProfileSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const input = await parseBody(req, updateProfileSchema);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: input,
      select: { id: true, name: true, email: true, username: true, avatarUrl: true, bio: true, timezone: true },
    });
    return NextResponse.json({ user: updated });
  });
}

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
        bio: user.bio,
        timezone: user.timezone,
      },
    });
  });
}
