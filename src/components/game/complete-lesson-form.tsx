"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { toast } from "sonner";

interface CompleteLessonFormProps {
  lessonId: string;
  nodeId: string;
  userId: string;
  completed: boolean;
}

export function CompleteLessonForm({
  lessonId,
  nodeId,
  userId,
  completed,
}: CompleteLessonFormProps) {
  const [submitting, setSubmitting] = useState(false);

  if (completed) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-signal font-semibold">✓ Completed</span>
        <span className="text-muted-foreground">XP awarded</span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const idempotencyKey = `${lessonId}-${userId}-${Date.now()}`;
      const res = await fetch("/api/game/lessons/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lessonId, idempotencyKey }),
      });
      if (!res.ok) throw new Error("Unable to complete lesson.");
      const data = await res.json();
      if (data.reward?.xpAwarded > 0) {
        toast.success(`+${data.reward.xpAwarded} XP`, {
          description: "Lesson complete",
          className: "glow-xp",
        });
      }
      if (data.reward?.leveledUp) {
        toast.success(`Level up! Now level ${data.reward.newLevel}`, {
          className: "glow-xp",
          duration: 4000,
        });
      }
      // Reload to reflect completion.
      window.location.reload();
    } catch {
      toast.error("Could not complete lesson.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <Button
        type="submit"
        variant="signal"
        disabled={submitting}
        className="w-full"
      >
        {submitting ? "Completing…" : "Mark lesson complete"}
      </Button>
    </form>
  );
}
