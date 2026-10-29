"use client";

import { Badge } from "@/components/ui";

const tierLabels: Record<string, string> = {
  DISCOVERED: "Discovered",
  UNDERSTOOD: "Understood",
  PRACTICED: "Practiced",
  DEMONSTRATED: "Demonstrated",
  MASTERED: "Mastered",
};

const tierTones: Record<string, string> = {
  DISCOVERED: "outline",
  UNDERSTOOD: "neutral",
  PRACTICED: "accent",
  DEMONSTRATED: "xp",
  MASTERED: "xp",
};

interface MasteryIndicatorProps {
  tier: string;
  effectiveTier: string;
  evidenceCount?: number;
}

export function MasteryIndicator({
  tier,
  effectiveTier,
  evidenceCount,
}: MasteryIndicatorProps) {
  const tone = tierTones[effectiveTier] ?? "neutral";
  return (
    <div className="flex items-center gap-2">
      <Badge tone={tone}>{tierLabels[effectiveTier] ?? effectiveTier}</Badge>
      {evidenceCount && (
        <span className="text-[10px] text-muted-foreground">
          {evidenceCount} evidence
        </span>
      )}
    </div>
  );
}
