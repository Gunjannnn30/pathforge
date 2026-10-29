import { NextResponse, type NextRequest } from "next/server";
import { handleApi, parseBody, requireUser } from "@/server/http";
import { listCosmetics, getUserInventory, getEquipped, equipCosmetic } from "@/server/services/cosmetics";
import { z } from "zod";

export const runtime = "nodejs";

const equipSchema = z.object({ cosmeticItemId: z.string().min(1) });

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const [cosmetics, inventory, equipped] = await Promise.all([
      listCosmetics(),
      getUserInventory(user.id),
      getEquipped(user.id),
    ]);
    return NextResponse.json({ cosmetics, inventory, equipped });
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser(req);
    const { cosmeticItemId } = await parseBody(req, equipSchema);
    const profile = await equipCosmetic(user.id, cosmeticItemId);
    return NextResponse.json({ profile });
  });
}
