import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { getSkillNode } from "@/server/services/content";
import { MasteryIndicator } from "@/components/game/mastery-indicator";
import { CompleteLessonForm } from "@/components/game/complete-lesson-form";

export const metadata = ({ params }: { params: Promise<{ topicId: string }> }) => ({
  title: "Topic — Pathforge",
});

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ roadmapId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const { topicId } = await params;
  const node = await getSkillNode(topicId, user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {node.title}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {node.explanation ?? "No description available."}
          </p>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {node.progress?.status ?? "unknown"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {node.lessons.length > 0 ? (
            node.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                completed={node.lessonCompletions?.[lesson.id] ?? false}
                nodeId={node.id}
                userId={user.id}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
              No lessons published for this topic yet.
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border border-input bg-card p-4 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground">Assessments</h3>
            <div className="mt-3 space-y-2">
              {node.assessments.length > 0 ? (
                node.assessments.map((a) => (
                  <div key={a.id} className="border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{a.title}</span>
                      <span className="text-muted-foreground">+{a.xpReward} XP</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No assessments yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonCard({ lesson, completed, nodeId, userId }: any) {
  return (
    <div className="rounded-xl border border-input bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{lesson.title}</h4>
          <p className="text-[10px] text-muted-foreground">
            {lesson.comprehensionCheck ? "With comprehension check" : "Lesson"}
            &middot; +{lesson.xpReward} XP
          </p>
        </div>
        {completed && (
          <span className="text-xs font-semibold text-signal">Completed</span>
        )}
      </div>
      <div className="prose prose-sm text-muted-foreground max-w-none mb-4">
        {lesson.body}
      </div>
      <CompleteLessonForm
        lessonId={lesson.id}
        nodeId={nodeId}
        userId={userId}
        completed={completed}
      />
    </div>
  );
}
