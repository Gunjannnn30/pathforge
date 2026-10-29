"use client";

import { cn } from "@/lib/utils";

interface XPProgressBarProps {
  progressPct: number;
  level: number;
  totalXP: number;
  needed: number;
  className?: string;
  reducedMotion?: boolean;
}

export function XPProgressBar({
  progressPct,
  level,
  totalXP,
  needed,
  className,
  reducedMotion = false,
}: XPProgressBarProps) {
  const style = reducedMotion
    ? { width: `${progressPct}%`, transition: "none" as const }
    : { width: `${progressPct}%`, "--fill-width": `${progressPct}%"` };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Level {level}
        </span>
        <span className="text-[10px] font-semibold text-foreground">
          {totalXP} / {totalXP + needed} XP
        </span>
      </div>
      <div className="w-full h-3 rounded-full border border-input bg-muted/60 overflow-hidden">
        <div
          className="h-full bg-xp text-xp-foreground glow-xp shadow-[0_0_12px_hsl(var(--xp)/.4)] animate-[xp-fill_0.6s_cubic-bezier(.2,.8,.2,1)_both]"
          style={style}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress to next level"
        />
      </div>
    </div>
  );
}
