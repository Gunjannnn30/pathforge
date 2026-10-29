import { NextResponse, type NextRequest } from "next/server";
import { handleApi, parseBody, requireUser } from "@/server/http";
import { updateSettingsSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const input = await parseBody(req, updateSettingsSchema);
    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...input },
      update: input,
    });
    return NextResponse.json({ settings: updated });
  });
}

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ settings });
  });
}
