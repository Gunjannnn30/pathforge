import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { listRoadmaps } from "@/server/services/content";

export const metadata = { title: "Roadmaps — Pathforge" };

export default async function RoadmapsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const roadmaps = await listRoadmaps(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Roadmaps
          </h1>
          <p className="mt-1 text-muted-foreground">
            Choose a learning path. Each roadmap is a kingdom of connected
            skills.
          </p>
        </div>
        <a href="/world" className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent transition">
          Back to world
        </a>
      </div>

      {roadmaps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
          No roadmaps available yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((r) => (
            <div
              key={r.id}
              className={cn(
                "group rounded-xl border p-4 text-left transition",
                r.enrolled
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:bg-accent",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground">
                  {r.title}
                </h3>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {r.role ?? "General"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {r.description}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {r.difficulty}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {r.progress}% complete
                </span>
              </div>
              {!r.enrolled ? (
                <a
                  key={r.id}
                  href={`/enroll/${r.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-secondary px-2.5 py-1.5 text-[10px] font-semibold text-secondary-foreground hover:bg-accent transition"
                >
                  Start roadmap
                </a>
              ) : (
                <a
                  href={`/world/roadmaps/${r.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-secondary px-2.5 py-1.5 text-[10px] font-semibold text-secondary-foreground hover:bg-accent transition"
                >
                  Continue
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...inputs: Array<string | boolean | undefined | null>) {
  return inputs.filter(Boolean).join(" ");
}
