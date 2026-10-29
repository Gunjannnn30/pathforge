import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { LevelCard, StreakDisplay, RewardNotification } from "@/components/game";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "World — Pathforge" };

export default async function WorldPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const [profile, roadmapMastery, recentXp, streak] = await Promise.all([
    prisma.userGameProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, level: 1, totalXP: 0 },
      update: {},
      select: {
        level: true,
        totalXP: true,
        currentStreak: true,
        longestStreak: true,
      },
    }),
    prisma.userSkillProgress.groupBy({
      by: ["tier"],
      where: { userId: user.id },
      _count: { tier: true },
    }),
    prisma.xPTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.userStreakRecord.findMany({
      where: { userId: user.id },
      select: { localDate: true },
      take: 7,
    }),
  ]);

  const progress = {
    level: profile.level,
    totalXP: profile.totalXP,
    progressPct: 0,
    needed: 0,
  };

  const mastered = roadmapMastery.find((r) => r.tier === "MASTERED")?._count.tier ?? 0;
  const total = roadmapMastery.reduce((sum, r) => sum + r._count.tier, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Your world
          </h1>
          <p className="mt-1 text-muted-foreground">
            Pick up where you left off. Every action below awards XP for
            demonstrated learning.
          </p>
        </div>
        <div className="flex items-end gap-4">
          <StreakDisplay
            currentStreak={profile.currentStreak ?? 0}
            longestStreak={profile.longestStreak ?? 0}
            hide={false}
          />
        </div>
      </div>

      <RewardNotification reward={null} />

      <section className="rounded-xl border border-input bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Progression
          </h2>
        </div>
        <LevelCard
          level={profile.level}
          rank="Initiate"
          totalXP={profile.totalXP}
          progressPct={progress.progressPct}
          needed={progress.needed}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-input bg-card p-4 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills mastered</div>
          <div className="mt-2 font-display text-3xl font-bold text-foreground">{mastered}</div>
          {total > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {mastered} of {total} progressed skills
            </div>
          )}
        </div>
        <div className="rounded-lg border border-input bg-card p-4 shadow-soft">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent XP</div>
          <div className="mt-2 space-y-2">
            {recentXp.length > 0 ? (
              recentXp.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="truncate text-foreground">{t.reason}</span>
                  <span className="text-xs font-semibold text-xp">+{t.amount}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-input bg-card p-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Continue your journey
        </h2>
        <div className="text-xs text-muted-foreground">
          No active roadmap. Browse roadmaps to begin your first quest.
        </div>
      </section>
    </div>
  );
}
