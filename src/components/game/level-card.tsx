"use client";

import { Badge } from "@/components/ui";

interface LevelCardProps {
  level: number;
  rank: string;
  totalXP: number;
  progressPct: number;
  needed: number;
  onLevelUp?: () => void;
}

export function LevelCard({
  level,
  rank,
  totalXP,
  progressPct,
  needed,
  onLevelUp,
}: LevelCardProps) {
  return (
    <div className="rounded-xl border border-input bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Progression Rank
          </div>
          <div className="text-xl font-display font-bold text-foreground">
            {rank}
          </div>
        </div>
        <Badge tone="xp">Level {level}</Badge>
      </div>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{totalXP} total XP</span>
        <span>·</span>
        <span>{needed} XP to next level</span>
      </div>
      <div className="h-2.5 w-full rounded-full border border-input bg-muted/60 overflow-hidden relative">
        <div
          className="h-full bg-primary rounded-full shadow-[0_0_16px_hsl(var(--primary)/.5)]"
          style={{ width: `${Math.min(100, progressPct)}%` }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
