"use client";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  hide: boolean;
}

export function StreakDisplay({ currentStreak, longestStreak, hide }: StreakDisplayProps) {
  if (hide) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-1.5 text-xs">
      <span className="text-xp font-semibold">🔥 {currentStreak}</span>
      <span className="text-muted-foreground">day streak</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-[10px] font-semibold text-muted-foreground">
        Best: {longestStreak}
      </span>
    </div>
  );
}
