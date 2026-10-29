"use client";

import { Badge } from "@/components/ui";

interface AchievementCardProps {
  slug: string;
  title: string;
  description: string;
  category: string;
  badgeIcon: string;
  earned: boolean;
  unlockedAt?: Date | null;
  rewardXp?: number;
}

const categoryColors: Record<string, string> = {
  exploration: "signal",
  learning: "primary",
  practice: "accent",
  mastery: "xp",
  consistency: "signal",
  projects: "accent",
};

export function AchievementCard({
  slug,
  title,
  description,
  category,
  badgeIcon,
  earned,
  unlockedAt,
  rewardXp,
}: AchievementCardProps) {
  return (
    <div
      className={cn(
        "group rounded-lg border p-3 text-left transition hover:bg-accent/50",
        earned ? "border-xp/50 bg-xp/5" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 flex h-10 w-10 items-center justify-center rounded-lg text-sm",
            earned ? "bg-xp text-xp-foreground shadow-glow-xp" : "bg-muted text-muted-foreground",
          )}
        >
          {badgeIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground">
              {title}
            </h3>
            {earned && <Badge tone="xp" size="sm">Earned</Badge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={categoryColors[category] ?? "neutral"}>{category}</Badge>
            {rewardXp && (
              <span className="text-[10px] font-semibold text-muted-foreground">
                +{rewardXp} XP
              </span>
            )}
            {earned && unlockedAt && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                Earned {new Date(unlockedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: Array<string | boolean | undefined | null>) {
  return inputs.filter(Boolean).join(" ");
}
