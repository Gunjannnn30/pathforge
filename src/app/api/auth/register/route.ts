import { NextResponse, type NextRequest } from "next/server";
import { registerSchema } from "@/lib/schemas";
import { handleApi, parseBody, requireUser } from "@/server/http";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/server/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { clientIp, enforceRate } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const ip = clientIp(req);
    enforceRate(`register-ip:${ip}`, 10, 15 * 60 * 1000);
    const input = await parseBody(req, registerSchema);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Account already exists." } },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        username: input.username,
        passwordHash,
      },
    });

    // Create default settings and an empty game profile.
    await prisma.userSettings.create({ data: { userId: user.id } });
    await prisma.userGameProfile.create({ data: { userId: user.id } });

    const { token, expiresAt } = await createSession(user.id, {
      userAgent: req.headers.get("user-agent"),
      ip,
    });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, username: user.username } });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return response;
  });
}
