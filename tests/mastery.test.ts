import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { recordEvidence, computeEffectiveTier, syncSkillProgress } from "@/server/services/mastery";

const prisma = new PrismaClient();

let userId: string;
let nodeId: string;
let roadmapId: string;
let domainId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: "mastery-test@example.com",
      username: "masterytest",
      name: "Mastery Tester",
      passwordHash: "hash",
    },
  });
  userId = user.id;

  const domain = await prisma.learningDomain.create({
    data: { slug: "mastery-domain", title: "Mastery Domain", order: 1 },
  });
  domainId = domain.id;
  const roadmap = await prisma.roadmap.create({
    data: { slug: "mastery-roadmap", title: "Mastery Roadmap", domainId: domain.id, order: 1 },
  });
  roadmapId = roadmap.id;
  const node = await prisma.skillNode.create({
    data: { slug: "mastery-node", title: "Mastery Node", roadmapId: roadmap.id, order: 1 },
  });
  nodeId = node.id;
});

afterAll(async () => {
  await prisma.userMasteryEvidence.deleteMany({ where: { userId } });
  await prisma.userSkillProgress.deleteMany({ where: { userId } });
  await prisma.skillNode.delete({ where: { id: nodeId } });
  await prisma.roadmap.delete({ where: { id: roadmapId } });
  await prisma.learningDomain.delete({ where: { id: domainId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("mastery evidence", () => {
  it("records evidence and computes effective tier", async () => {
    await recordEvidence({
      userId,
      conceptId: nodeId,
      evidenceType: "COMPREHENSION_CHECK",
      result: "PASS",
      tier: "UNDERSTOOD",
    });

    const tier = await computeEffectiveTier(userId, nodeId);
    expect(tier).toBe("UNDERSTOOD");

    const synced = await syncSkillProgress(userId, nodeId);
    expect(synced.tier).toBe("UNDERSTOOD");
    expect(synced.status).toBe("understood");
  });

  it("uses the highest passed tier", async () => {
    await recordEvidence({
      userId,
      conceptId: nodeId,
      evidenceType: "PRACTICE_EXERCISE",
      result: "PASS",
      tier: "PRACTICED",
    });

    expect(await computeEffectiveTier(userId, nodeId)).toBe("PRACTICED");

    await recordEvidence({
      userId,
      conceptId: nodeId,
      evidenceType: "TOPIC_ASSESSMENT",
      result: "PASS",
      tier: "DEMONSTRATED",
    });

    expect(await computeEffectiveTier(userId, nodeId)).toBe("DEMONSTRATED");
  });

  it("failed evidence does not raise the tier", async () => {
    await recordEvidence({
      userId,
      conceptId: nodeId,
      evidenceType: "TOPIC_ASSESSMENT",
      result: "FAIL",
      tier: "MASTERED",
    });

    // Should remain DEMONSTRATED from the earlier PASS.
    expect(await computeEffectiveTier(userId, nodeId)).toBe("DEMONSTRATED");
  });
});
