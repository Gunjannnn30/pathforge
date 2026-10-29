import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { handleApi, parseBody, clientIp, enforceRate } from "@/server/http";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/server/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const ip = clientIp(req);
    enforceRate(`login-ip:${ip}`, 20, 15 * 60 * 1000);
    const input = await parseBody(req, loginSchema);
    enforceRate(`login-id:${input.identifier.toLowerCase()}`, 8, 15 * 60 * 1000);

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: input.identifier }, { username: input.identifier }] },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new Error("Email/username or password is incorrect.");
    }

    const { token, expiresAt } = await createSession(user.id, {
      userAgent: req.headers.get("user-agent"),
      ip,
    });
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return response;
  });
}
