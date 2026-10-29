"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface RewardNotificationProps {
  reward: {
    xpAwarded: number;
    leveledUp: boolean;
    previousLevel: number;
    newLevel: number;
    alreadyAwarded: boolean;
  } | null;
}

export function RewardNotification({ reward }: RewardNotificationProps) {
  useEffect(() => {
    if (!reward || reward.alreadyAwarded) return;
    if (reward.xpAwarded > 0) {
      toast.success(`+${reward.xpAwarded} XP`, {
        description: "Learning reward",
        className: "glow-xp",
      });
    }
    if (reward.leveledUp) {
      toast.success(`Level up! You are now level ${reward.newLevel}`, {
        description: "Progression rank increased",
        className: "glow-xp",
        duration: 4000,
      });
    }
  }, [reward]);

  return null;
}
