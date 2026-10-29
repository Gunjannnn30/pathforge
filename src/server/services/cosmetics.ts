
/**
 * Optional cosmetic customization. Educational progress never depends on
 * cosmetics, and they cannot be purchased with real money in the MVP.
 */

import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";

export async function listCosmetics() {
  return prisma.cosmeticItem.findMany({
    where: { isPublished: true },
    orderBy: [{ cosmeticType: "asc" }, { name: "asc" }],
  });
}

export async function getUserInventory(userId: string) {
  return prisma.userCosmeticInventory.findMany({
    where: { userId },
    include: { item: true },
    orderBy: { unlockedAt: "desc" },
  });
}

export async function getEquipped(userId: string) {
  const profile = await prisma.userGameProfile.findUnique({
    where: { userId },
    select: { selectedCosmetics: true },
  });
  return profile?.selectedCosmetics ?? null;
}

export async function equipCosmetic(
  userId: string,
  cosmeticItemId: string,
) {
  const inventory = await prisma.userCosmeticInventory.findUnique({
    where: { userId_cosmeticItemId: { userId, cosmeticItemId } },
    select: { id: true },
  });
  if (!inventory) throw notFound("You do not own this cosmetic item.");

  const profile = await prisma.userGameProfile.upsert({
    where: { userId },
    create: {
      userId,
      selectedCosmetics: {
        equipped: [cosmeticItemId],
      } as unknown as Prisma.InputJsonValue,
    },
    update: {
      selectedCosmetics: {
        equipped: [cosmeticItemId],
      } as unknown as Prisma.InputJsonValue,
    },
  });
  return profile;
}

import { Prisma } from "@prisma/client";

