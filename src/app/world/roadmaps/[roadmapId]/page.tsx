import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getRoadmap } from "@/server/services/content";
import { Button, Badge } from "@/components/ui";

export const metadata = ({ params }: { params: Promise<{ roadmapId: string }> }) => ({
  title: "Roadmap — Pathforge",
});

export default async function RoadmapPage({ params }: { params: Promise<{ roadmapId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const { roadmapId } = await params;
  const roadmap = await getRoadmap(roadmapId, user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {roadmap.title}
          </h1>
          <p className="mt-1 text-muted-foreground">{roadmap.description}</p>
        </div>
        {!roadmap.enrollment && (
          <a
            href={`/enroll/${roadmapId}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-accent transition"
          >
            Start roadmap
          </a>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{roadmap.domain.title}</span>
        <span>·</span>
        <Badge>{roadmap.role ?? "General"}</Badge>
        <span>·</span>
        <Badge>{roadmap.difficulty}</Badge>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Skill tree
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {roadmap.skillNodes.map((node) => (
            <Link
              key={node.id}
              href={`/topics/${node.id}?roadmapId=${roadmapId}`}
              className="group block rounded-xl border p-3 text-left transition hover:bg-accent"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground">
                  {node.title}
                </h3>
                <Badge>{node.difficulty}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {node.explanation ?? "No description available."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {roadmap.enrollment && roadmap.enrollment.completedAt && (
        <div className="rounded-lg border border-xp/50 bg-xp/10 p-4">
          <h3 className="text-sm font-semibold text-xp">Roadmap complete</h3>
          <p className="mt-1 text-xs text-xp/80">
            You have finished this path. Celebrate your progress and choose your
            next kingdom.
          </p>
        </div>
      )}
    </div>
  );
}
