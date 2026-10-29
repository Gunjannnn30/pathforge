"use client";

import { Button, Badge } from "@/components/ui";

interface QuestObjective {
  kind: string;
  target: string;
  count: number;
  current: number;
  completed: boolean;
}

interface QuestCardProps {
  id: string;
  slug: string;
  title: string;
  description: string;
  questType: string;
  rewardXp: number;
  status: string;
  progress: QuestObjective[];
  reason?: string;
  onDismiss?: () => void;
  onComplete?: () => void;
}

const typeColors: Record<string, string> = {
  DAILY: "signal",
  WEEKLY: "primary",
  ROADMAP: "accent",
  PERSONALIZED: "xp",
};

export function QuestCard({
  id,
  slug,
  title,
  description,
  questType,
  rewardXp,
  status,
  progress,
  reason,
  onDismiss,
  onComplete,
}: QuestCardProps) {
  const completed = progress.every((p) => p.completed);
  const doneCount = progress.filter((p) => p.completed).length;

  return (
    <div className={cn("group rounded-lg border p-3 text-left transition", status === "COMPLETED" ? "border-xp/50 bg-xp/5" : "border-border")}>
      <div className="flex items-start gap-2">
        <Badge tone={typeColors[questType] ?? "neutral"}>{questType}</Badge>
        {status === "COMPLETED" && <Badge tone="xp">Complete</Badge>}
        {status === "DISMISSED" && <Badge tone="outline">Dismissed</Badge>}
      </div>
      <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {reason && (
        <p className="mt-1 text-xs text-signal/80">{reason}</p>
      )}
      <div className="mt-2 space-y-1">
        {progress.map((p, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className={cn("truncate", p.completed ? "text-muted-foreground line-through" : "text-foreground")}>
              {p.kind} — {p.current}/{p.count}
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold",
                p.completed ? "text-signal" : "text-muted-foreground",
              )}
            >
              {p.completed ? "Done" : `${p.current}/${p.count}`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground">
          +{rewardXp} XP
        </span>
        <div className="flex items-center gap-2">
          {status === "ACTIVE" && completed && onComplete ? (
            <Button variant="ghost" size="sm" onClick={onComplete}>
              Claim reward
            </Button>
          ) : null}
          {status === "ACTIVE" && onDismiss ? (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: Array<string | boolean | undefined | null>) {
  return inputs.filter(Boolean).join(" ");
}
