import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { QuestCard } from "@/components/game/quest-card";

export const metadata = { title: "Quests — Pathforge" };

export default async function QuestsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const res = await fetch(
    `${process.env.APP_URL || "http://localhost:3000"}/api/game/quests`,
    { credentials: "include", cache: "no-store" },
  );
  const data = await res.json();

  const active = data.quests?.filter((q: any) => q.status === "ACTIVE") ?? [];
  const completed = data.quests?.filter((q: any) => q.status === "COMPLETED") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Quests
          </h1>
          <p className="mt-1 text-muted-foreground">
            Missions that turn your learning goals into action.
          </p>
        </div>
      </div>

      {active.length > 0 ? (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Active
          </h2>
          <div className="mt-2 space-y-3">
            {active.map((q: any) => (
              <QuestCard
                key={q.id}
                id={q.id}
                slug={q.slug}
                title={q.title}
                description={q.description}
                questType={q.questType}
                rewardXp={q.rewardXp}
                status={q.status}
                progress={q.progress}
                reason={q.reason}
                onDismiss={() => {}}
                onComplete={() => {}}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground">
          No active quests. Start a roadmap to unlock missions.
        </div>
      )}

      {completed.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Completed
          </h2>
          <div className="mt-2 space-y-3">
            {completed.map((q: any) => (
              <QuestCard
                key={q.id}
                id={q.id}
                slug={q.slug}
                title={q.title}
                description={q.description}
                questType={q.questType}
                rewardXp={q.rewardXp}
                status={q.status}
                progress={q.progress}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
