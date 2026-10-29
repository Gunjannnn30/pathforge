"use client";

import { Badge } from "@/components/ui";

interface SkillTreeNodeProps {
  id: string;
  title: string;
  explanation?: string | null;
  difficulty: string;
  status: string;
  tier: string;
  xpReward: number;
  prerequisitesMet: boolean;
  available: boolean;
  mastered: boolean;
  reviewDue: boolean;
  onSelect: () => void;
}

const statusColors: Record<string, string> = {
  unknown: "muted-foreground",
  discovered: "muted-foreground",
  available: "signal",
  "in_progress": "primary",
  practiced: "accent",
  demonstrated: "xp",
  mastered: "xp",
  "review_due": "signal",
};

export function SkillTreeNode({
  id,
  title,
  explanation,
  difficulty,
  status,
  tier,
  xpReward,
  prerequisitesMet,
  available,
  mastered,
  reviewDue,
  onSelect,
}: SkillTreeNodeProps) {
  const isAvailable = available && prerequisitesMet;
  const locked = !prerequisitesMet;

  return (
    <button
      onClick={onSelect}
      disabled={locked}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition group",
        locked
          ? "border-dashed border-border/40 bg-muted/30 opacity-60"
          : mastered
            ? "border-xp bg-xp/10 shadow-glow-xp"
            : reviewDue
              ? "border-signal bg-signal/10"
              : "border-border bg-card hover:bg-accent",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition",
          locked
            ? "bg-muted text-muted-foreground"
            : mastered
              ? "bg-xp text-xp-foreground shadow-glow-xp"
              : reviewDue
                ? "bg-signal text-signal-foreground"
                : isAvailable
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
        )}
      >
        {mastered ? "✦" : reviewDue ? "↻" : isAvailable ? "▶" : "◐"}
      </div>
      <div className="flex-1">
        <h4 className="text-xs font-semibold text-foreground group-hover:text-foreground leading-snug">
          {title}
        </h4>
        {explanation && (
          <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">
            {explanation}
          </p>
        )}
        <div className="mt-1.5 flex items-center justify-between">
          <Badge tone={statusColors[status] ?? "neutral"} size="sm">
            {tier}
          </Badge>
          <span className="text-[10px] font-semibold text-muted-foreground">
            +{xpReward} XP
          </span>
        </div>
      </div>
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl text-[10px] font-semibold text-white/80 backdrop-blur-sm">
          Prerequisite required
        </div>
      )}
    </button>
  );
}

function cn(...inputs: Array<string | boolean | undefined | null>) {
  return inputs.filter(Boolean).join(" ");
}
