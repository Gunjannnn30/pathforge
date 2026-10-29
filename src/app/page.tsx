import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/world");
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-grid-bg p-6">
      <div className="max-w-2xl surface p-8 md:p-12 rounded-2xl shadow-lift hairline">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Pathforge
          </h1>
          <p className="mt-2 text-muted-foreground">
            A gamified learning platform. Progress through skill trees, complete
            quests, defeat boss assessments, and build a personal world of
            knowledge.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <a
            href="/auth/login"
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center hover:bg-accent transition"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sign in
            </span>
          </a>
          <a
            href="/auth/register"
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center hover:bg-accent transition"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Create account
            </span>
          </a>
          <a
            href="/world"
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center hover:bg-accent transition disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Explore the world
            </span>
          </a>
        </div>

        <p className="mt-8 text-xs text-muted-foreground text-center">
          Game mechanics reward demonstrated learning, not merely activity.
        </p>
      </div>
    </div>
  );
}
