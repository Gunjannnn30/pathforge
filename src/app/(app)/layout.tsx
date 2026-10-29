import Link from "next/link";
import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { Avatar, Button } from "@/components/ui";
import { xpProgress, rankForLevel } from "@/server/services/reward";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Pathforge",
};

const nav = [
  { href: "/world", label: "World", icon: "🗺️" },
  { href: "/roadmaps", label: "Roadmaps", icon: "🛤️" },
  { href: "/quests", label: "Quests", icon: "📜" },
  { href: "/achievements", label: "Achievements", icon: "🏅" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const profile = await prisma.userGameProfile.findUnique({
    where: { userId: user.id },
    select: { level: true, totalXP: true },
  });

  const progress = profile ? xpProgress(profile.totalXP) : xpProgress(0);
  const rank = profile ? rankForLevel(profile.level) : "Initiate";

  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-[4px]">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href="/world" className="flex items-center gap-2 font-display font-bold text-foreground">
            Pathforge
          </Link>
          <div className="flex items-center gap-3">
            <Avatar name={user.name} id={user.id} src={user.avatarUrl} size="sm" />
            <div className="hidden md:block">
              <div className="text-xs font-medium text-foreground">{user.name}</div>
              <div className="text-[10px] text-muted-foreground">{rank} · Lvl {profile?.level ?? 1}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <nav className="fixed inset-y-0 left-0 z-30 w-20 border-r border-border bg-card p-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex w-full flex-col items-center gap-1 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition"
            >
              <span className="text-xs">{item.icon}</span>
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          ))}
        </nav>

        <main className="ml-20 flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <footer className="border-t border-border/50 bg-secondary/40 px-6 py-3 text-[10px] text-muted-foreground">
        Game mechanics reward demonstrated learning, not merely activity.
      </footer>
    </div>
  );
}
