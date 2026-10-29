"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default async function EnrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/game/roadmaps/${id}/enroll`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Unable to enroll.");
        toast.success("Roadmap started.");
        router.push(`/world/roadmaps/${id}`);
      } catch {
        toast.error("Could not start roadmap.");
        router.push("/roadmaps");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <span className="text-muted-foreground">Starting roadmap…</span>
      </div>
    );
  }

  return null;
}
