import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { AchievementCard } from "@/components/game/achievement-card";

export const metadata = { title: "Achievements — Pathforge" };

export default async function AchievementsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const res = await fetch(
    `${process.env.APP_URL || "http://localhost:3000"}/api/game/achievements`,
    { credentials: "include", cache: "no-store" },
  );
  const data = await res.json();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Achievements
          </h1>
          <p className="mt-1 text-muted-foreground">
            Unlocked by demonstrated learning — awarded once, never for clicks.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        {data.definitions?.map((a: any) => (
          <AchievementCard
            key={a.slug}
            slug={a.slug}
            title={a.title}
            description={a.description}
            category={a.category}
            badgeIcon={a.badgeIcon}
            earned={a.earned}
            unlockedAt={null}
            rewardXp={a.rewardXp}
          />
        ))}
      </div>

      {data.earned && data.earned.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your gallery
          </h2>
          <div className="grid gap-3 md:grid-cols-4">
            {data.earned.map((a: any) => (
              <AchievementCard
                key={a.slug}
                slug={a.slug}
                title={a.title}
                description={a.description}
                category={a.category}
                badgeIcon={a.badgeIcon}
                earned={true}
                unlockedAt={a.unlockedAt}
                rewardXp={a.achievement.rewardXp}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
